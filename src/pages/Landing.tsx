import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Baby,
  ClipboardCheck,
  Clock,
  Users,
  MonitorSmartphone,
  FileText,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: ClipboardCheck,
    title: "Smart Attendance",
    description:
      "Track AM/PM check-ins and check-outs with a single tap. Mark absences and view real-time attendance status for every child.",
  },
  {
    icon: Clock,
    title: "Automatic Hours",
    description:
      "Total hours are calculated automatically based on check-in and check-out times — no manual math required.",
  },
  {
    icon: MonitorSmartphone,
    title: "Kiosk Mode",
    description:
      "Let parents check in and out their children using a family PIN on a dedicated kiosk screen — perfect for shared tablets.",
  },
  {
    icon: Users,
    title: "Child Management",
    description:
      "Maintain detailed records for each child including parent info, IDs, and family numbers all in one place.",
  },
  {
    icon: FileText,
    title: "Monthly Reports",
    description:
      "Generate and download monthly attendance sheets ready for state reporting and record keeping.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & Private",
    description:
      "Your data is protected with enterprise-grade security. Each provider's data is completely isolated and private.",
  },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Baby className="w-5 h-5 text-primary" />
            </div>
            <span className="font-heading font-bold text-xl tracking-tight">
              Kindred Kids
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gap-1.5">
                Get Started <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5" />
        <div className="container relative px-4 py-24 md:py-36 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Baby className="w-4 h-4" />
            Built for Home Daycare Providers
          </div>
          <h1 className="font-heading text-4xl md:text-6xl font-extrabold leading-tight max-w-3xl mx-auto">
            Attendance tracking{" "}
            <span className="text-primary">made simple</span> for childcare
            providers
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Stop juggling paper sign-in sheets. Kindred Kids gives you a clean,
            intuitive way to manage attendance, generate reports, and keep
            families connected — all from one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-10">
            <Link to="/auth">
              <Button size="lg" className="gap-2 text-base px-8 h-12 rounded-xl shadow-lg shadow-primary/20">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" size="lg" className="text-base px-8 h-12 rounded-xl">
                See Features
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-card">
        <div className="container px-4 py-8 grid grid-cols-3 gap-6 text-center">
          {[
            { value: "100%", label: "Free to start" },
            { value: "< 1 min", label: "Daily check-in" },
            { value: "24/7", label: "Access anywhere" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-heading text-2xl md:text-3xl font-extrabold text-primary">
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container px-4 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Everything you need to run your daycare
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl mx-auto text-lg">
            Powerful features wrapped in a simple, beautiful interface designed
            specifically for home daycare providers.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card
              key={feature.title}
              className="group hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-heading font-bold text-lg mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container px-4 pb-20">
        <div className="relative rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--secondary)/0.15),transparent_60%)]" />
          <div className="relative">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary-foreground">
              Ready to simplify your daycare?
            </h2>
            <p className="mt-4 text-primary-foreground/80 text-lg max-w-lg mx-auto">
              Join providers who have ditched the paperwork. Set up takes less
              than 2 minutes.
            </p>
            <Link to="/auth">
              <Button
                size="lg"
                variant="secondary"
                className="mt-8 text-base px-10 h-12 rounded-xl shadow-lg"
              >
                Get Started Free
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Baby className="w-4 h-4 text-primary" />
            <span className="font-heading font-semibold text-sm">
              Kindred Kids
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <p>(c) {new Date().getFullYear()} Kindred Kids. All rights reserved.</p>
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


