import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

const LAST_UPDATED = "April 21, 2026";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container h-16 px-4 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl">Terms of Service</h1>
          <Link to="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container px-4 py-8">
        <Card>
          <CardContent className="p-6 space-y-6 text-sm leading-6">
            <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">1. Service</h2>
              <p>{APP_NAME} is a software service for childcare providers to manage attendance, reporting, and related operational records.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">2. Accounts</h2>
              <p>You are responsible for maintaining the confidentiality of your account, choosing authorized users carefully, and ensuring your account information stays accurate.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">3. Acceptable Use</h2>
              <p>You may use the service only for lawful childcare administration purposes. You may not use the service to store data you do not have the right to collect or process.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">4. Billing</h2>
              <p>Paid subscriptions renew automatically until canceled. If payment fails or your subscription expires, access to paid features may be limited until billing is restored.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">5. Data Responsibility</h2>
              <p>You are responsible for obtaining all necessary parent or guardian permissions and for complying with any childcare recordkeeping rules that apply to your business.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">6. Availability</h2>
              <p>We work to keep the service available and secure, but we do not guarantee uninterrupted access. We may update features, pricing, or policies over time.</p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">7. Contact</h2>
              <p>Questions about these terms can be sent to {SUPPORT_EMAIL}.</p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Terms;
