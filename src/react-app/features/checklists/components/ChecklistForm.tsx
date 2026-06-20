import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Checkbox } from '@/react-app/components/ui/checkbox';
import { Input } from '@/react-app/components/ui/input';
import { Label } from '@/react-app/components/ui/label';
import { Textarea } from '@/react-app/components/ui/textarea';
import { FileUpload } from '@/react-app/components/ui/file-upload';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/react-app/components/ui/dialog';
import { useCreateChecklist } from '../hooks/useChecklists';
import { api } from '@/react-app/lib/api-client';
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_ITEM_LABELS,
  createDefaultItems,
  type ChecklistType,
  type ChecklistItems,
} from '../types/checklist.types';

interface ChecklistFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  vehicleName: string;
  plateNumber: string;
  type: ChecklistType;
  onSuccess?: () => void;
}

export function ChecklistForm({
  open,
  onOpenChange,
  bookingId,
  vehicleName,
  plateNumber,
  type,
  onSuccess,
}: ChecklistFormProps) {
  const [items, setItems] = React.useState<ChecklistItems>(createDefaultItems());
  const [kmReading, setKmReading] = React.useState<string>('');
  const [fuelLevel, setFuelLevel] = React.useState<string>('100');
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [notes, setNotes] = React.useState('');
  const [damageNotes, setDamageNotes] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);

  const createChecklist = useCreateChecklist();

  const isReturn = type === 'return';
  const title = isReturn ? 'Checklist Return' : 'Checklist Pickup';
  const description = isReturn
    ? 'Isi kondisi kendaraan saat customer mengembalikan motor'
    : 'Isi kondisi kendaraan saat motor diserahkan ke customer';

  const handleItemChange = (key: string, checked: boolean) => {
    setItems((prev) => ({ ...prev, [key]: checked }));
  };

  const handleToggleAll = (checked: boolean) => {
    const newItems: ChecklistItems = {};
    for (const key of Object.keys(items)) {
      newItems[key] = checked;
    }
    setItems(newItems);
  };

  const allChecked = Object.values(items).every(Boolean);
  const someChecked = Object.values(items).some(Boolean);

  const handleSubmit = async () => {
    try {
      setError(null);

      // Validate
      if (!kmReading || Number(kmReading) < 0) {
        setError('KM reading wajib diisi dan harus >= 0');
        return;
      }

      const minPhotos = isReturn ? 2 : 4;
      if (photos.length < minPhotos) {
        setError(`Minimal ${minPhotos} foto wajib diupload`);
        return;
      }

      // Upload photos first
      setUploading(true);
      const uploadedUrls: string[] = [];
      for (const file of photos) {
        const result = await api.upload('/v1/uploads', file);
        if (result.success && result.data.url) {
          uploadedUrls.push(result.data.url);
        }
      }
      setUploading(false);

      // Create checklist
      await createChecklist.mutateAsync({
        bookingId,
        type,
        items,
        kmReading: Number(kmReading),
        fuelLevel: fuelLevel ? Number(fuelLevel) : null,
        photos: uploadedUrls.length > 0 ? uploadedUrls : null,
        notes: notes || null,
        damageNotes: damageNotes || null,
      });

      // Reset form
      setItems(createDefaultItems());
      setKmReading('');
      setFuelLevel('100');
      setPhotos([]);
      setNotes('');
      setDamageNotes('');

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan checklist');
      setUploading(false);
    }
  };

  const isSubmitting = createChecklist.isPending || uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" position="center">
        <DialogHeader>
          <DialogTitle>
            {title} — {vehicleName} ({plateNumber})
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
          {/* Odometer & Fuel */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="kmReading">
                KM Reading <span className="text-destructive">*</span>
              </Label>
              <Input
                id="kmReading"
                type="number"
                placeholder="Contoh: 15000"
                value={kmReading}
                onChange={(e) => setKmReading(e.target.value)}
                min={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuelLevel">BBM (%)</Label>
              <Input
                id="fuelLevel"
                type="number"
                placeholder="0-100"
                value={fuelLevel}
                onChange={(e) => setFuelLevel(e.target.value)}
                min={0}
                max={100}
              />
            </div>
          </div>

          {/* Checklist Items */}
          {CHECKLIST_CATEGORIES.map((category) => (
            <div key={category.label} className="space-y-3">
              <h4 className="text-sm font-semibold text-foreground border-b pb-2">
                {category.label}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {category.items.map((itemKey) => (
                  <div
                    key={itemKey}
                    className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={items[itemKey]}
                      onCheckedChange={(checked) =>
                        handleItemChange(itemKey, checked === true)
                      }
                    />
                    <Label className="text-sm font-normal cursor-pointer">
                      {CHECKLIST_ITEM_LABELS[itemKey]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Toggle All */}
          <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
            <Checkbox
              checked={allChecked ? true : someChecked ? 'indeterminate' : false}
              onCheckedChange={(checked) => handleToggleAll(checked === true)}
            />
            <Label className="text-sm font-medium cursor-pointer">
              {allChecked ? 'Semua item OK' : 'Pilih semua item'}
            </Label>
          </div>

          {/* Photos */}
          <div className="space-y-2">
            <Label>
              Foto Kendaraan <span className="text-destructive">*</span>
              <span className="text-muted-foreground font-normal ml-2">
                (min. {isReturn ? 2 : 4} foto)
              </span>
            </Label>
            <FileUpload
              accept="image/*"
              maxSize={5 * 1024 * 1024}
              maxFiles={10}
              multiple
              value={photos}
              onChange={setPhotos}
              showPreview
              size="sm"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea
              id="notes"
              placeholder="Catatan umum tentang kondisi kendaraan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Damage Notes (return only) */}
          {isReturn && (
            <div className="space-y-2">
              <Label htmlFor="damageNotes">
                Catatan Kerusakan
                <span className="text-muted-foreground font-normal ml-2">
                  (wajib jika ada item yang berubah dari OK ke tidak OK)
                </span>
              </Label>
              <Textarea
                id="damageNotes"
                placeholder="Deskripsikan kerusakan yang ditemukan..."
                value={damageNotes}
                onChange={(e) => setDamageNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {uploading ? 'Upload foto...' : 'Menyimpan...'}
              </>
            ) : (
              'Simpan Checklist'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
