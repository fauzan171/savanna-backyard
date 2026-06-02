import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { PageHeader } from "@/react-app/components/layout/page-header";
import { PaymentTable } from "../components/PaymentTable";
import { PaymentForm } from "../components/PaymentForm";
import { usePayments, useCreatePayment } from "../hooks/usePayments";
import { useBookings } from "@/react-app/features/bookings/hooks/useBookings";
import type {
  Payment,
  PaymentFormData,
  PaymentFilters,
} from "../types/payment.types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import type { ComboboxOption } from "@/react-app/components/ui/combobox";

export function PaymentsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PaymentFilters>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading } = usePayments(filters);
  const createPayment = useCreatePayment();

  // Fetch real bookings from API so bookingId contains actual UUIDs
  const { data: bookingsData } = useBookings({ limit: 100 });

  const bookingOptions: ComboboxOption[] =
    bookingsData?.items?.map((b) => ({
      value: b.id,
      label: b.bookingNumber,
      sublabel: `${b.customer?.name ?? "Unknown"} • ${b.vehicle?.name ?? "Unknown"}`,
    })) ?? [];

  const handleCreatePayment = async (data: PaymentFormData) => {
    await createPayment.mutateAsync({
      bookingId: data.bookingId,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      transactionReference: data.transactionReference,
      proofUrl: data.proofUrl,
      notes: data.notes,
    });
    setIsCreateOpen(false);
  };

  const handleRowClick = (payment: Payment) => {
    navigate(`/payments/${payment.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Manage payment records and verification"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Record Payment
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={filters.status || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              status:
                value === "all"
                  ? undefined
                  : (value as PaymentFilters["status"]),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.method || "all"}
          onValueChange={(value) =>
            setFilters({
              ...filters,
              method:
                value === "all"
                  ? undefined
                  : (value as PaymentFilters["method"]),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Methods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Methods</SelectItem>
            <SelectItem value="QRIS">QRIS</SelectItem>
            <SelectItem value="Gateway">Payment Gateway</SelectItem>
            <SelectItem value="Bank_Transfer">Bank Transfer</SelectItem>
            <SelectItem value="Cash">Cash</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <PaymentTable
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <PaymentForm
            onSubmit={handleCreatePayment}
            onCancel={() => setIsCreateOpen(false)}
            isLoading={createPayment.isPending}
            bookingOptions={bookingOptions}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
