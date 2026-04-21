import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/brand";

const CoppaNotice = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container h-16 px-4 flex items-center justify-between">
          <h1 className="font-heading font-bold text-xl">COPPA Notice</h1>
          <Link to="/">
            <Button variant="outline" size="sm">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="container px-4 py-8">
        <Card>
          <CardContent className="p-6 space-y-4 text-sm leading-6">
            <p>
              This application is intended for childcare providers and authorized adults, not for use by children.
            </p>
            <p>
              Because attendance data can include children&apos;s personal information, we apply safeguards consistent
              with handling children&apos;s data and the spirit of the Children&apos;s Online Privacy Protection Act (COPPA).
            </p>
            <p>
              Providers are responsible for ensuring they have appropriate legal authority and parent/guardian consent
              to collect, store, and process child attendance information.
            </p>
            <p>
              If you believe child information was submitted improperly, contact your administrator to request review
              and removal. Billing and legal questions can be sent to {SUPPORT_EMAIL}.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CoppaNotice;
