import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { APP_NAME, SUPPORT_EMAIL } from "@/lib/brand";

const LAST_UPDATED = "April 21, 2026";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container h-16 px-4 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl">Privacy Policy</h1>
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
              <h2 className="font-semibold text-base">1. Information We Collect</h2>
              <p>
                We collect information needed to operate this childcare attendance service, including provider account
                details, child profile details, and attendance records entered by authorized users.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">2. How We Use Information</h2>
              <p>
                We use collected information to provide attendance tracking, reporting, kiosk workflows, account
                access, billing support, and customer support. We do not sell personal information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">3. Data Sharing</h2>
              <p>
                We share information only with service providers required to run the application (for example hosting,
                storage, authentication, and payment providers), or when required by law.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">4. Data Retention</h2>
              <p>
                We retain information for as long as needed to provide the service and meet legal or operational
                obligations. You may request deletion of your account data, subject to applicable legal requirements.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">5. Security</h2>
              <p>
                We use reasonable administrative and technical safeguards to protect data. No method of transmission or
                storage is guaranteed to be 100% secure.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">6. Children&apos;s Data</h2>
              <p>
                This service is intended for childcare providers and authorized guardians. Providers are responsible for
                ensuring they have lawful rights to collect and manage child attendance information.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">7. Your Choices</h2>
              <p>
                You may access and update account and profile details from within the application. For data requests,
                contact {SUPPORT_EMAIL}.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">8. Changes to this Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised
                effective date.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-semibold text-base">9. Contact</h2>
              <p>
                Questions about this policy or {APP_NAME} can be sent to {SUPPORT_EMAIL}.
              </p>
            </section>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
