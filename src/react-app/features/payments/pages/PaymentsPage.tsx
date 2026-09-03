import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/react-app/components/ui/button";
import { PageHeader } from "@/react-app/components/layout/page-header";
import { PaymentTable } from "../components/PaymentTable";
import { PaymentForm } from "../components/PaymentForm";
import { toast } from "@/react-app/hooks/useToast";
import { extractApiError } from "@/react-app/lib/extract-error";
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
import { paymentMethodLabels, paymentStatusLabels } from "@/react-app/lib/labels";

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
      sublabel: `${b.customer?.name ?? "Tanpa nama"} - ${b.vehicle?.name ?? "Tanpa kendaraan"}`,
    })) ?? [];

  const handleCreatePayment = async (data: PaymentFormData) => {
    try {
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
    } catch (error) {
      // TC-PAY-001: backend now blocks over-amount — surface the reason.
      toast({
        title: "Gagal mencatat pembayaran",
        description: extractApiError(error),
        variant: "destructive",
      });
    }
  };

  const handleRowClick = (payment: Payment) => {
    navigate(`/payments/${payment.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pembayaran"
        description="Catat, cek, dan verifikasi pembayaran customer"
        actions={
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="size-4 mr-2" />
            Catat Pembayaran
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
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="Pending">{paymentStatusLabels.pending}</SelectItem>
            <SelectItem value="Verified">{paymentStatusLabels.verified}</SelectItem>
            <SelectItem value="Failed">{paymentStatusLabels.failed}</SelectItem>
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
            <SelectValue placeholder="Semua metode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua metode</SelectItem>
            <SelectItem value="QRIS">QRIS</SelectItem>
            <SelectItem value="Gateway">{paymentMethodLabels.Gateway}</SelectItem>
            <SelectItem value="Bank_Transfer">{paymentMethodLabels.Bank_Transfer}</SelectItem>
            <SelectItem value="Cash">{paymentMethodLabels.Cash}</SelectItem>
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
            <DialogTitle>Catat Pembayaran</DialogTitle>
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
