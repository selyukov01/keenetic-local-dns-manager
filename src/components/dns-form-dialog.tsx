"use client";

import { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createLocalizedDnsRecordSchema, createLocalizedMultiRecordSchema } from "@/lib/validations";
import type { DnsRecord } from "@/types/dns";
import { useTranslations } from "@/contexts/i18n-context";

// Информация о дубликате: новая запись и существующие записи с тем же доменом
interface DuplicateInfo {
  newRecord: DnsRecord;
  existingRecords: DnsRecord[];
}

interface DnsFormDialogProps {
  mode: "create" | "edit";
  record?: DnsRecord;
  existingRecords?: DnsRecord[];
  onSubmit: (
    oldDomain: string,
    oldAddress: string,
    newDomain: string,
    newAddress: string
  ) => Promise<void>;
  onSubmitMultiple?: (records: DnsRecord[]) => Promise<void>;
  trigger?: React.ReactNode;
}

export function DnsFormDialog({
  mode,
  record,
  existingRecords = [],
  onSubmit,
  onSubmitMultiple,
  trigger,
}: DnsFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingData, setPendingData] = useState<{ type: "edit"; data: { domain: string; address: string } } | { type: "create"; data: MultiRecordInput } | null>(null);
  const t = useTranslations();

  const localizedDnsRecordSchema = useMemo(() => createLocalizedDnsRecordSchema(t), [t]);
  const localizedMultiRecordSchema = useMemo(() => createLocalizedMultiRecordSchema(t), [t]);
  type MultiRecordInput = z.infer<typeof localizedMultiRecordSchema>;

  // Форма для режима редактирования (одна запись)
  const editForm = useForm({
    resolver: zodResolver(localizedDnsRecordSchema),
    defaultValues: {
      domain: record?.domain || "",
      address: record?.address || "",
    },
  });

  // Форма для режима создания (множественные записи)
  const createForm = useForm<MultiRecordInput>({
    resolver: zodResolver(localizedMultiRecordSchema),
    defaultValues: {
      records: [{ domain: "", address: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: createForm.control,
    name: "records",
  });

  // Найти дубликаты по домену среди существующих записей
  const findDuplicates = (newRecords: DnsRecord[], excludeRecord?: DnsRecord): DuplicateInfo[] => {
    const result: DuplicateInfo[] = [];
    for (const newRec of newRecords) {
      const matching = existingRecords.filter(
        (existing) =>
          existing.domain.toLowerCase() === newRec.domain.toLowerCase() &&
          // При редактировании исключаем текущую запись
          !(excludeRecord &&
            existing.domain === excludeRecord.domain &&
            existing.address === excludeRecord.address)
      );
      if (matching.length > 0) {
        result.push({ newRecord: newRec, existingRecords: matching });
      }
    }
    return result;
  };

  // Выполнить отправку без проверки дубликатов
  const executeEditSubmit = async (data: { domain: string; address: string }) => {
    setIsSubmitting(true);
    try {
      await onSubmit(
        record?.domain || "",
        record?.address || "",
        data.domain,
        data.address
      );
      setOpen(false);
      editForm.reset();
    } catch (error) {
      console.error("Form submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeCreateSubmit = async (data: MultiRecordInput) => {
    setIsSubmitting(true);
    try {
      if (onSubmitMultiple && data.records.length > 1) {
        await onSubmitMultiple(data.records);
      } else if (data.records.length === 1) {
        const rec = data.records[0];
        await onSubmit("", "", rec.domain, rec.address);
      }
      setOpen(false);
      createForm.reset({ records: [{ domain: "", address: "" }] });
    } catch (error) {
      console.error("Form submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (data: { domain: string; address: string }) => {
    const found = findDuplicates([{ domain: data.domain, address: data.address }], record);
    if (found.length > 0) {
      setDuplicates(found);
      setPendingData({ type: "edit", data });
      return;
    }
    await executeEditSubmit(data);
  };

  const handleCreateSubmit = async (data: MultiRecordInput) => {
    const found = findDuplicates(data.records);
    if (found.length > 0) {
      setDuplicates(found);
      setPendingData({ type: "create", data });
      return;
    }
    await executeCreateSubmit(data);
  };

  // Подтвердить добавление несмотря на дубликаты
  const handleConfirmDuplicates = async () => {
    if (!pendingData) return;
    if (pendingData.type === "edit") {
      await executeEditSubmit(pendingData.data);
    } else {
      await executeCreateSubmit(pendingData.data);
    }
    setDuplicates([]);
    setPendingData(null);
  };

  // Вернуться к редактированию
  const handleCancelDuplicates = () => {
    setDuplicates([]);
    setPendingData(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && record && mode === "edit") {
      editForm.reset({
        domain: record.domain,
        address: record.address,
      });
    } else if (!newOpen) {
      editForm.reset();
      createForm.reset({ records: [{ domain: "", address: "" }] });
      setDuplicates([]);
      setPendingData(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus/>
            {t.addRecord}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {duplicates.length > 0 ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.duplicatesFound}</DialogTitle>
              <DialogDescription>
                {duplicates.length === 1
                  ? t.duplicateSingleDesc
                  : t.duplicateMultipleDesc}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {duplicates.map((dup, i) => (
                <Alert key={i}>
                  <AlertTriangle className="size-4" />
                  <AlertDescription>
                    {dup.newRecord.domain}{" "}
                    {dup.existingRecords.length === 1 ? t.alreadyExistsWithAddress : t.alreadyExistsWithAddresses}
                    {dup.existingRecords.map((r, j) => (
                      <span key={j} style={{display: "contents"}}> {r.address}
                        {j < dup.existingRecords.length - 1 && ", "}
                      </span>
                    ))}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelDuplicates}
                disabled={isSubmitting}
              >
                {t.back}
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDuplicates}
                disabled={isSubmitting}
              >
                {isSubmitting ? t.saving : t.addAnyway}
              </Button>
            </DialogFooter>
          </>
        ) : (
        <>
        {mode === "edit" ? (
          <DialogHeader>
            <DialogTitle>
              {t.editDnsRecord}
            </DialogTitle>
            <DialogDescription>
              {t.editDnsRecordDesc}
            </DialogDescription>
          </DialogHeader>
        ) : (
          <DialogHeader className="ml-2 mr-2">
            <DialogTitle>
              {t.addDnsRecords}
            </DialogTitle>
            <DialogDescription>
              {t.addDnsRecordsDesc}
            </DialogDescription>
          </DialogHeader>
        )}

        {mode === "edit" ? (
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="domain"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.domain}</FormLabel>
                    <FormControl>
                      <Input placeholder="example.local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.ipAddress}</FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t.cancel}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t.saving : t.save}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <Form {...createForm}>
            <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <div className="p-2 space-y-3 max-h-[300px] overflow-y-auto">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <FormField
                        control={createForm.control}
                        name={`records.${index}.domain`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.domain}</FormLabel>}
                            <FormControl>
                              <Input placeholder="example.local" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <FormField
                        control={createForm.control}
                        name={`records.${index}.address`}
                        render={({ field }) => (
                          <FormItem>
                            {index === 0 && <FormLabel>{t.ipAddress}</FormLabel>}
                            <FormControl>
                              <Input placeholder="192.168.1.100" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={index === 0 ? "mt-5" : ""}
                        onClick={() => remove(index)}
                        title={t.delete}
                      >
                        <Trash2 className="text-muted-foreground" color="var(--destructive)" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="ml-2 mr-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ domain: "", address: "" })}
                  className="w-full"
                >
                  <Plus/>
                  {t.addAnotherRecord}
                </Button>
              </div>

              <DialogFooter className="ml-2 mr-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {t.cancel}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? t.saving
                    : fields.length > 1
                    ? t.addCount(fields.length)
                    : t.add}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
        </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Separate edit button component for table rows
export function DnsEditButton({
  record,
  existingRecords,
  onSubmit,
}: {
  record: DnsRecord;
  existingRecords?: DnsRecord[];
  onSubmit: (
    oldDomain: string,
    oldAddress: string,
    newDomain: string,
    newAddress: string
  ) => Promise<void>;
}) {
  const t = useTranslations();
  return (
    <DnsFormDialog
      mode="edit"
      record={record}
      existingRecords={existingRecords}
      onSubmit={onSubmit}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          title={t.edit}
        >
          <Pencil />
        </Button>
      }
    />
  );
}
