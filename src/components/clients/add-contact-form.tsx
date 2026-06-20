import { UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addContact } from "@/app/(app)/clients/actions";

export function AddContactForm({ clientId }: { clientId: string }) {
  // Bind the clientId so the Server Action receives (clientId, formData).
  const action = addContact.bind(null, clientId);
  return (
    <form
      action={action}
      className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-xs font-medium text-muted-foreground">
          Full Name
        </label>
        <Input id="fullName" name="fullName" required placeholder="Jane Owner" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-xs font-medium text-muted-foreground">
          Email
        </label>
        <Input id="email" name="email" type="email" placeholder="jane@biz.com" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ownershipPct" className="text-xs font-medium text-muted-foreground">
          Ownership %
        </label>
        <Input
          id="ownershipPct"
          name="ownershipPct"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="51"
        />
      </div>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isGuarantor"
          value="1"
          className="size-4 rounded border-input"
        />
        <span>Guarantor</span>
      </label>
      <Button type="submit" className="w-full">
        <UserPlus className="size-4" />
        Add Contact
      </Button>
    </form>
  );
}
