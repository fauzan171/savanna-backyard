import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import { PageHeader } from "@/react-app/components/layout/page-header";
import { useLeads, useCreateLead } from "../hooks/useLeads";
import { LeadTable } from "../components/LeadTable";
import { LeadForm } from "../components/LeadForm";
import type { Lead, LeadFormData } from "../types/lead.types";

export default function LeadsPage() {
  const navigate = useNavigate();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);

  // Queries and mutations
  const { data, isLoading } = useLeads({ page: 1, limit: 25 });
  const createMutation = useCreateLead();

  const handleCreate = async (formData: LeadFormData) => {
    try {
      const result = await createMutation.mutateAsync(formData);
      setIsCreateDialogOpen(false);
      if (result.data?.id) {
        navigate(`/leads/${result.data.id}`);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleRowClick = (lead: Lead) => {
    navigate(`/leads/${lead.id}`);
  };

  const handleConvert = (lead: Lead) => {
    setConvertLead(lead);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads"
        description="Track and manage sales leads"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Add Lead
          </Button>
        }
      />

      <LeadTable
        data={data?.items ?? []}
        isLoading={isLoading}
        onConvert={handleConvert}
        onRowClick={handleRowClick}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <LeadForm
            onSubmit={handleCreate}
            onCancel={() => setIsCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Convert to Booking Dialog */}
      {convertLead && (
        <Dialog
          open={!!convertLead}
          onOpenChange={(open) => !open && setConvertLead(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Convert Lead to Booking</DialogTitle>
            </DialogHeader>
            <p className="text-muted-foreground">
              Convert <strong>{convertLead.name}</strong> to a booking. This
              feature requires the Booking module to be implemented.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConvertLead(null)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
