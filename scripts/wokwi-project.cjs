const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const project = path.join(root, 'wokwi');
const mode = process.argv[2] || 'check';

function check() {
  const diagram = JSON.parse(fs.readFileSync(path.join(project, 'diagram.json'), 'utf8'));
  const expected = [['esp:5', 'ultrasonic:TRIG'], ['esp:18', 'ultrasonic:ECHO'], ['esp:5V', 'ultrasonic:VCC'], ['esp:GND.1', 'ultrasonic:GND']];
  for (const [from, to] of expected) {
    if (!diagram.connections.some(([a, b]) => (a === from && b === to) || (a === to && b === from))) {
      throw new Error(`Missing sensor wire: ${from} -> ${to}`);
    }
  }
  if (diagram.connections.some(wire => wire.slice(0, 2).some(pin => /^esp:D(5|18)$/.test(pin)))) {
    throw new Error('This ESP32 board uses pins 5/18, not D5/D18.');
  }
  for (const name of ['sketch.ino', 'diagram.json']) {
    const local = fs.readFileSync(path.join(project, name), 'utf8').replace(/\r\n/g, '\n');
    const online = fs.readFileSync(path.join(root, 'sample-wokwiweb', name), 'utf8').replace(/\r\n/g, '\n');
    if (local !== online) throw new Error(`${name} differs between local/online. Run npm run wokwi:sync.`);
  }
  console.log('Wokwi wiring and local/online files match.');
}

try {
  if (mode === 'sync' || mode === 'build') {
    for (const name of ['sketch.ino', 'diagram.json']) {
      fs.copyFileSync(path.join(project, name), path.join(root, 'sample-wokwiweb', name));
    }
    console.log('Updated sample-wokwiweb from the local Wokwi source.');
  }
  check();
  if (mode === 'build') {
    const candidates = [
      path.join(os.homedir(), '.platformio', 'penv', process.platform === 'win32' ? 'Scripts/platformio.exe' : 'bin/platformio'),
      'platformio', 'pio',
    ];
    const executable = candidates.find(candidate => spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0);
    if (!executable) throw new Error('PlatformIO was not found. Install/open the PlatformIO IDE extension, then retry.');
    const result = spawnSync(executable, ['run', '--project-dir', project], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) throw new Error('Firmware build failed. Do not start the simulator with an old firmware.bin.');
    console.log('Firmware rebuilt. Stop and start Wokwi to load it.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
