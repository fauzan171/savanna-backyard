import { CheckCircle2, XCircle, Camera, Fuel, Gauge } from 'lucide-react';
import { Badge } from '@/react-app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/react-app/components/ui/card';
import {
  CHECKLIST_CATEGORIES,
  CHECKLIST_ITEM_LABELS,
  type ChecklistResponse,
} from '../types/checklist.types';

interface ChecklistDisplayProps {
  checklist: ChecklistResponse;
  className?: string;
}

export function ChecklistDisplay({ checklist, className }: ChecklistDisplayProps) {
  const isReturn = checklist.type === 'return';
  const items = checklist.items;
  const photos = checklist.photos || [];

  const allOk = Object.values(items).every(Boolean);
  const failedItems = Object.entries(items).filter(([, v]) => !v);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {isReturn ? '📋 Checklist Return' : '📋 Checklist Pickup'}
          </CardTitle>
          <Badge variant={allOk ? 'default' : 'error'}>
            {allOk ? 'Semua OK' : `${failedItems.length} item bermasalah`}
          </Badge>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Gauge className="size-4" />
            {checklist.kmReading.toLocaleString()} km
          </span>
          {checklist.fuelLevel !== null && (
            <span className="flex items-center gap-1">
              <Fuel className="size-4" />
              {checklist.fuelLevel}%
            </span>
          )}
          <span>
            {new Date(checklist.createdAt).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Checklist Items by Category */}
        {CHECKLIST_CATEGORIES.map((category) => {
          const categoryItems = category.items.filter((key) => key in items);
          const hasIssues = categoryItems.some((key) => !items[key]);

          return (
            <div key={category.label} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                {category.label}
                {hasIssues && (
                  <Badge variant="error" className="text-xs">
                    Ada masalah
                  </Badge>
                )}
              </h4>
              <div className="grid grid-cols-2 gap-1">
                {categoryItems.map((key) => (
                  <div
                    key={key}
                    className={`flex items-center gap-2 text-sm py-1 px-2 rounded ${
                      items[key]
                        ? 'text-foreground'
                        : 'text-destructive bg-destructive/5'
                    }`}
                  >
                    {items[key] ? (
                      <CheckCircle2 className="size-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="size-4 text-destructive shrink-0" />
                    )}
                    <span className="truncate">{CHECKLIST_ITEM_LABELS[key]}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Photos */}
        {photos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Camera className="size-4" />
              Foto ({photos.length})
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {photos.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-md overflow-hidden border hover:opacity-80 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {checklist.notes && (
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Catatan</h4>
            <p className="text-sm text-muted-foreground">{checklist.notes}</p>
          </div>
        )}

        {/* Damage Notes */}
        {checklist.damageNotes && (
          <div className="space-y-1 p-3 rounded-md bg-destructive/5 border border-destructive/20">
            <h4 className="text-sm font-semibold text-destructive">Catatan Kerusakan</h4>
            <p className="text-sm text-destructive/80">{checklist.damageNotes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface ChecklistComparisonProps {
  pickup: ChecklistResponse;
  returnChecklist: ChecklistResponse;
  className?: string;
}

export function ChecklistComparison({
  pickup,
  returnChecklist,
  className,
}: ChecklistComparisonProps) {
  const pickupItems = pickup.items;
  const returnItems = returnChecklist.items;

  // Find items that changed from true to false (new damage)
  const damagedItems = Object.entries(returnItems)
    .filter(([key, value]) => pickupItems[key] === true && value === false)
    .map(([key]) => key);

  return (
    <div className={className}>
      {damagedItems.length > 0 && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <h4 className="text-sm font-semibold text-destructive mb-2">
            ⚠️ Perubahan Kondisi Terdeteksi
          </h4>
          <ul className="space-y-1">
            {damagedItems.map((key) => (
              <li key={key} className="text-sm text-destructive/80 flex items-center gap-2">
                <XCircle className="size-4 shrink-0" />
                {CHECKLIST_ITEM_LABELS[key]}
                <span className="text-muted-foreground">
                  (OK → Bermasalah)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <ChecklistDisplay checklist={pickup} />
        <ChecklistDisplay checklist={returnChecklist} />
      </div>
    </div>
  );
}
