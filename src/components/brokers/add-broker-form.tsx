import { UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createBroker } from "@/app/(app)/brokers/actions";

export function AddBrokerForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Broker / ISO</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={createBroker} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-medium text-muted-foreground">
              Name
            </label>
            <Input id="name" name="name" required placeholder="Acme Capital ISO" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Email
            </label>
            <Input id="email" name="email" type="email" placeholder="deals@acme.com" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="phone" className="text-xs font-medium text-muted-foreground">
              Phone
            </label>
            <Input id="phone" name="phone" placeholder="(555) 010-2030" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="commissionPct" className="text-xs font-medium text-muted-foreground">
              Commission %
            </label>
            <Input
              id="commissionPct"
              name="commissionPct"
              type="number"
              step="0.01"
              min="0"
              placeholder="3.0"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              <UserPlus className="size-4" />
              Add Broker
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
