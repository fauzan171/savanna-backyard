import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Textarea } from "@/react-app/components/ui/textarea";
import { FormField } from "@/react-app/components/ui/form-field";
import { Calendar } from "@/react-app/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/react-app/components/ui/popover";
import { cn } from "@/react-app/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
import { Combobox, ComboboxOption } from "@/react-app/components/ui/combobox";
import { Badge } from "@/react-app/components/ui/badge";
import { Spinner } from "@/react-app/components/ui/spinner";
import {
  bookingFormSchema,
  type BookingFormData,
  type CreateAddonRequest,
} from "../types/booking.types";
import { useCustomers } from "@/react-app/features/customers/hooks/useCustomers";
import {
  useVehicles,
  useVehicleAvailability,
} from "@/react-app/features/vehicles/hooks/useVehicles";

interface BookingFormProps {
  onSubmit: (data: BookingFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
}

const addonTypes: Array<{ value: CreateAddonRequest["type"]; label: string }> =
  [
    { value: "TourGuide", label: "Pemandu tur" },
    { value: "SafetyGear", label: "Perlengkapan keselamatan" },
    { value: "PickupDropoff", label: "Antar/jemput" },
    { value: "Package", label: "Paket" },
    { value: "Other", label: "Lainnya" },
  ];

const formatCurrency = (amount: number, currency: "IDR" | "USD" = "IDR") => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export function BookingForm({
  onSubmit,
  onCancel,
  isLoading,
}: BookingFormProps) {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [addons, setAddons] = useState<CreateAddonRequest[]>([]);
  const [showAddonForm, setShowAddonForm] = useState(false);
  const [newAddon, setNewAddon] = useState<CreateAddonRequest>({
    type: "SafetyGear",
    description: "",
    amount: 0,
    isMandatory: false,
  });

  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: vehiclesData } = useVehicles({ limit: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customerId: "",
      vehicleId: "",
      startDate: new Date(),
      endDate: new Date(),
      paymentTerms: "DP_Pickup",
      currency: "IDR",
      notes: "",
    },
  });

  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const currency = watch("currency");

  // Group vehicles by name (model)
  const vehicleModels: ComboboxOption[] = useMemo(() => {
    const all = vehiclesData?.items ?? [];
    const seen = new Set<string>();
    return all
      .filter((v) => {
        const key = v.name.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((v) => ({
        value: v.name.toLowerCase().trim(),
        label: v.name,
        sublabel: `${all.filter((u) => u.name.toLowerCase().trim() === v.name.toLowerCase().trim()).length} unit`,
      }));
  }, [vehiclesData]);

  const formattedStart = startDate ? format(startDate, "yyyy-MM-dd") : null;
  const formattedEnd = endDate ? format(endDate, "yyyy-MM-dd") : null;
  const datesReady =
    formattedStart && formattedEnd && formattedStart < formattedEnd;

  const { data: availabilityData, isLoading: availabilityLoading } =
    useVehicleAvailability(
      selectedModel && datesReady
        ? { startDate: formattedStart!, endDate: formattedEnd! }
        : null,
    );

  const availableUnits = useMemo(() => {
    if (!selectedModel || !availabilityData) return [];
    return (availabilityData.availableVehicles ?? []).filter(
      (v) => v.name.toLowerCase().trim() === selectedModel,
    );
  }, [selectedModel, availabilityData]);

  const unavailableUnits = useMemo(() => {
    if (!selectedModel || !availabilityData) return [];
    return (availabilityData.unavailableVehicles ?? []).filter(
      (v) => v.name.toLowerCase().trim() === selectedModel,
    );
  }, [selectedModel, availabilityData]);

  // Auto-assign first available unit
  useEffect(() => {
    if (availableUnits.length > 0) {
      const unit = availableUnits[0];
      setSelectedVehicle(unit.id);
      setValue("vehicleId", unit.id);
    } else {
      setSelectedVehicle(null);
      setValue("vehicleId", "");
    }
  }, [availableUnits, setValue]);

  // Reset unit when model changes
  useEffect(() => {
    setSelectedVehicle(null);
    setValue("vehicleId", "");
  }, [selectedModel, setValue]);

  const customerOptions: ComboboxOption[] =
    customersData?.items?.map((c) => ({
      value: c.id,
      label: c.name,
      sublabel: c.phone,
    })) ?? [];

  const handleAddAddon = () => {
    if (newAddon.description && newAddon.amount > 0) {
      setAddons([...addons, newAddon]);
      setNewAddon({
        type: "SafetyGear",
        description: "",
        amount: 0,
        isMandatory: false,
      });
      setShowAddonForm(false);
    }
  };

  const handleRemoveAddon = (index: number) => {
    setAddons(addons.filter((_, i) => i !== index));
  };

  const onFormSubmit = async (data: BookingFormData) => {
    await onSubmit({ ...data, addons: addons.length > 0 ? addons : undefined });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Customer */}
      <FormField label="Pelanggan" required error={errors.customerId?.message}>
        <Combobox
          options={customerOptions}
          value={selectedCustomer}
          onChange={(value) => {
            setSelectedCustomer(value);
            if (value) setValue("customerId", value);
          }}
          placeholder="Pilih pelanggan..."
          searchPlaceholder="Cari pelanggan..."
        />
      </FormField>

      {/* Dates first — needed for availability check */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Tanggal Mulai"
          required
          error={errors.startDate?.message}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !startDate && "text-muted-foreground",
                )}
                disabled={isLoading || isSubmitting}
              >
                <CalendarIcon className="mr-2 size-4" />
                {startDate ? format(startDate, "dd MMM yyyy", { locale: id }) : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setValue("startDate", date)}
                // BUG#12: block past dates for the rental start
                disabled={{ before: new Date(new Date().setHours(0, 0, 0, 0)) }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FormField>

        <FormField label="Tanggal Selesai" required error={errors.endDate?.message}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !endDate && "text-muted-foreground",
                )}
                disabled={isLoading || isSubmitting}
              >
                <CalendarIcon className="mr-2 size-4" />
                {endDate ? format(endDate, "dd MMM yyyy", { locale: id }) : "Pilih tanggal"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={(date) => date && setValue("endDate", date)}
                // BUG#12: end date can't be before the chosen start date (or today)
                disabled={{ before: startDate ?? new Date(new Date().setHours(0, 0, 0, 0)) }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </FormField>
      </div>

      {/* Vehicle Model */}
      <FormField
        label="Model Kendaraan"
        required
        error={errors.vehicleId?.message}
      >
        <Combobox
          options={vehicleModels}
          value={selectedModel}
          onChange={(value) => setSelectedModel(value)}
          placeholder="Pilih model kendaraan..."
          searchPlaceholder="Cari model..."
        />
      </FormField>

      {/* Availability Result */}
      {selectedModel && datesReady && (
        <div className="rounded-lg border p-4 space-y-2">
          {availabilityLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner size="sm" />
              <span>Mengecek ketersediaan...</span>
            </div>
          ) : availableUnits.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--forest-green))]">
                <CheckCircle className="size-4" />
                <span>
                  {availableUnits.length} unit tersedia. Klik salah satu untuk memilih
                </span>
              </div>
              {availableUnits.map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => {
                    setSelectedVehicle(unit.id);
                    setValue("vehicleId", unit.id);
                  }}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors",
                    selectedVehicle === unit.id
                      ? "border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10"
                      : "hover:bg-muted/50",
                  )}
                >
                  <div>
                    <span className="font-medium">{unit.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      {unit.plateNumber}
                    </span>
                  </div>
                  <span className="text-muted-foreground text-xs">
                    {formatCurrency(unit.dailyRateIdr)}/hari
                  </span>
                </div>
              ))}
              {unavailableUnits.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  {unavailableUnits.length} unit tidak tersedia pada tanggal yang dipilih
                </p>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              <span>
                Tidak ada unit <strong>{selectedModel}</strong> yang tersedia pada tanggal yang dipilih.
                {unavailableUnits.length > 0 &&
                  ` Semua ${unavailableUnits.length} unit sudah dibooking.`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Payment Terms & Currency */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          label="Skema Pembayaran"
          required
          error={errors.paymentTerms?.message}
        >
          <Select
            value={watch("paymentTerms")}
            onValueChange={(value) =>
              setValue("paymentTerms", value as BookingFormData["paymentTerms"])
            }
            disabled={isLoading || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih skema pembayaran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DP_Pickup">DP + saat pickup</SelectItem>
              <SelectItem value="Full_Upfront">Lunas di awal</SelectItem>
              <SelectItem value="DP_After">DP + setelah kembali</SelectItem>
              <SelectItem value="Flexible">Fleksibel</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Mata Uang" error={errors.currency?.message}>
          <Select
            value={watch("currency")}
            onValueChange={(value) =>
              setValue("currency", value as BookingFormData["currency"])
            }
            disabled={isLoading || isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pilih mata uang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR - Rupiah Indonesia</SelectItem>
              <SelectItem value="USD">USD - Dolar AS</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
      </div>

      {/* Add-ons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">Tambahan Biaya</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddonForm(true)}
            disabled={isLoading || isSubmitting}
          >
            <Plus className="size-4 mr-2" />
            Tambah Biaya
          </Button>
        </div>

        {addons.length > 0 && (
          <div className="space-y-2">
            {addons.map((addon, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <div className="font-medium">{addon.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {addonTypes.find((t) => t.value === addon.type)?.label} •{" "}
                    {formatCurrency(addon.amount, currency as "IDR" | "USD")}
                    {addon.isMandatory && (
                      <Badge variant="outline" size="sm" className="ml-2">
                        Wajib
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveAddon(index)}
                  disabled={isLoading || isSubmitting}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {showAddonForm && (
          <div className="p-4 border rounded-lg space-y-4 bg-muted/50">
            <FormField label="Tipe">
              <Select
                value={newAddon.type}
                onValueChange={(value) =>
                  setNewAddon({
                    ...newAddon,
                    type: value as CreateAddonRequest["type"],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {addonTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Deskripsi" required>
              <Input
                value={newAddon.description}
                onChange={(e) =>
                  setNewAddon({ ...newAddon, description: e.target.value })
                }
                placeholder="Contoh: Helm dan jaket riding"
              />
            </FormField>
            <FormField label="Nominal" required>
              <Input
                type="number"
                value={newAddon.amount || ""}
                onChange={(e) =>
                  setNewAddon({ ...newAddon, amount: Number(e.target.value) })
                }
                placeholder="0"
              />
            </FormField>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isMandatory"
                checked={newAddon.isMandatory}
                onChange={(e) =>
                  setNewAddon({ ...newAddon, isMandatory: e.target.checked })
                }
                className="rounded border-input"
              />
              <label htmlFor="isMandatory" className="text-sm">
                Tambahan biaya wajib
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddonForm(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleAddAddon}
                disabled={!newAddon.description || newAddon.amount <= 0}
              >
                Tambah
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <FormField label="Catatan" error={errors.notes?.message}>
        <Textarea
          {...register("notes")}
          placeholder="Tulis permintaan khusus atau catatan operasional..."
          rows={3}
          disabled={isLoading || isSubmitting}
        />
      </FormField>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading || isSubmitting}
          >
            Batal
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading || isSubmitting || !selectedVehicle}
        >
          {isSubmitting ? (
            <>
              <Spinner size="sm" className="mr-2" />
              Membuat booking...
            </>
          ) : (
            "Buat Booking"
          )}
        </Button>
      </div>
    </form>
  );
}
