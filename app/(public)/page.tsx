import Image from "next/image";
import Link from "next/link";
import { PublicShell } from "@/components/shells/PublicShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Waves, BellRing, TrendingUp, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <PublicShell>
      <section className="text-center py-10 sm:py-16">
        <Image src="/logo.png" alt="FloodWatch" width={96} height={96} className="mx-auto mb-6" priority />
        <h1 className="font-display text-3xl sm:text-4xl font-semibold text-text-primary max-w-2xl mx-auto">
          Know your flood risk before the water does.
        </h1>
        <p className="text-text-secondary mt-4 max-w-xl mx-auto">
          Real-time water level monitoring with tiered alerts and rate-of-rise detection.
          Station status is public — no account needed.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Link href="/stations">
            <Button size="lg">View stations</Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary">
              Subscribe to alerts
            </Button>
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        <FeatureCard
          icon={Waves}
          title="Live water levels"
          description="Every station's current level rendered as an at-a-glance gauge, updating in real time."
        />
        <FeatureCard
          icon={TrendingUp}
          title="Rate-of-rise detection"
          description="Fast-rising water triggers an early Watch alert, even before hitting the hard threshold."
        />
        <FeatureCard
          icon={BellRing}
          title="Calm, factual alerts"
          description="Notifications stay instructive, not alarmist — even at Danger stage."
        />
        <FeatureCard
          icon={ShieldCheck}
          title="Tiered severity ladder"
          description="Normal, Watch, Warning, Danger — matching real hydrological agency conventions."
        />
      </section>
    </PublicShell>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Waves;
  title: string;
  description: string;
}) {
  return (
    <Card className="p-5">
      <Icon className="text-primary mb-3" size={24} />
      <h3 className="font-display font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary">{description}</p>
    </Card>
  );
}
