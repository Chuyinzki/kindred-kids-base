import { Link } from "react-router-dom";
import { ArrowRight, Baby, ClipboardCheck, Clock, FileText, MonitorSmartphone, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { APP_NAME, PLAN_INTERVAL, PLAN_NAME, PLAN_PRICE, SUPPORT_EMAIL, TRIAL_DAYS } from "@/lib/brand";

const features = [
  {
    icon: ClipboardCheck,
    title: "Smart Attendance",
    description: "Track AM/PM check-ins and check-outs with a single tap, mark absences, and keep a clean real-time attendance view.",
  },
  {
    icon: Clock,
    title: "Automatic Hours",
    description: "Hours are calculated automatically from each check-in and check-out so you spend less time doing manual cleanup.",
  },
  {
    icon: MonitorSmartphone,
    title: "Secure Kiosk Mode",
    description: "Let parents check children in and out from a dedicated kiosk flow without giving away provider access to the app.",
  },
  {
    icon: Users,
    title: "Child Management",
    description: "Keep child details, family info, and provider-ready records together in one place.",
  },
  {
    icon: FileText,
    title: "Monthly Reports",
    description: "Generate monthly attendance sheets that are ready for reporting, record keeping, and export.",
  },
  {
    icon: ShieldCheck,
    title: "Provider-First Privacy",
    description: "Each provider account is isolated so your daycare records stay private and easier to manage responsibly.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Baby className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1.5">
                Start Trial <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container relative px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Baby className="w-4 h-4" />
            Built for Home Daycare Providers
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto">
            Attendance tracking <span className="text-primary">made simple</span> for childcare providers
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Replace paper sign-in sheets with a provider-friendly workspace for daily attendance, parent kiosk check-in, and monthly reporting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/20">
                Start {TRIAL_DAYS}-Day Trial <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#pricing">
              <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl">
                See Pricing
              </Button>
            </a>
          </div>
          <p className="mt-6 text-sm md:text-base text-muted-foreground/90 italic">
            Originally built for a real daycare and now packaged for other providers who want less paperwork and faster reporting.
          </p>
        </div>
      </section>

      <section className="border-y border-border bg-card">
        <div className="container px-4 py-8 grid grid-cols-3 gap-6 text-center">
          {[
            { value: `$${PLAN_PRICE}/${PLAN_INTERVAL}`, label: `${PLAN_NAME} plan` },
            { value: `${TRIAL_DAYS} days`, label: "Free trial" },
            { value: "< 1 min", label: "Daily check-in" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-2xl md:text-3xl font-extrabold text-primary">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="container px-4 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">Everything you need to run your daycare</h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-lg">
            A focused tool for provider operations, not a bloated parent app.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="group hover:shadow-md hover:border-primary/20 transition-all duration-300">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="pricing" className="container px-4 pb-20">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="mb-6 text-center">
            <Badge variant="secondary" className="mb-3">Simple Pricing</Badge>
            <h2 className="font-heading text-2xl md:text-3xl font-bold">One provider plan, no long-term contract</h2>
            <p className="mt-2 text-muted-foreground">
              Start free, then keep your account active for a flat monthly price.
            </p>
          </div>
          <div className="mx-auto max-w-xl rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            <p className="font-heading text-3xl font-extrabold">
              ${PLAN_PRICE}
              <span className="text-base font-medium text-muted-foreground">/{PLAN_INTERVAL}</span>
            </p>
            <p className="mt-2 font-medium">{PLAN_NAME}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {TRIAL_DAYS}-day free trial. Attendance, child records, kiosk mode, and monthly reports included.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <Button size="lg" variant="outline">Talk to Support</Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="container px-4 pb-20">
        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="mb-6 text-center">
            <p className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">ICOE Format</p>
            <h2 className="mt-3 font-heading text-2xl md:text-3xl font-bold">Real monthly report outcomes, ready for submission</h2>
            <p className="mt-2 text-muted-foreground">Generate clean, consistent attendance exports in the ICOE format.</p>
          </div>
          <div className="grid gap-4">
            <figure className="overflow-hidden rounded-xl border border-border bg-background">
              <img src="/examples/Attendance_example.jpg" alt="ICOE attendance sheet example" className="w-full object-cover" loading="lazy" />
              <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Attendance Sheet Example</figcaption>
            </figure>
            <figure className="overflow-hidden rounded-xl border border-border bg-background">
              <img src="/examples/Provider_example.jpg" alt="ICOE provider sheet example" className="w-full object-cover" loading="lazy" />
              <figcaption className="border-t border-border px-3 py-2 text-xs text-muted-foreground">Provider Sheet Example</figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="container px-4 pb-20">
        <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_60%)]" />
          <div className="relative">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">Ready to simplify your daycare?</h2>
            <p className="mt-4 text-primary-foreground/80 text-lg max-w-lg mx-auto">
              Join providers who want cleaner attendance, faster monthly reports, and less daily admin work.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="mt-8 text-base px-10 h-12 rounded-xl shadow-lg">
                Start Your Free Trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-card">
        <div className="container px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Baby className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-sm">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <p>(c) {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">Privacy Policy</Link>
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">Terms</Link>
            <Link to="/coppa-notice" className="underline underline-offset-2 hover:text-foreground">COPPA Notice</Link>
          </div>
        </div>
        <div className="container px-4 pb-6 text-center">
          <p className="text-xs text-muted-foreground/80">Support: {SUPPORT_EMAIL}</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
