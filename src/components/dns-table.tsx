"use client";

import { useRef, useState } from "react";
import { RefreshCw,
  Download,
  Upload,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { DnsEditButton, DnsFormDialog } from "@/components/dns-form-dialog";
import type { DnsRecord } from "@/types/dns";
import { toast } from "sonner";
import { useDnsRecords } from "@/hooks/use-dns-records";
import { useTranslations } from "@/contexts/i18n-context";

interface DnsTableProps {
  records: DnsRecord[];
  isLoading: boolean;
}

type SortField = "domain" | "address" | null;
type SortDirection = "asc" | "desc";

// Генерируем уникальный ключ для записи
function getRecordKey(record: DnsRecord): string {
  return `${record.domain}:${record.address}`;
}

export function DnsTable({
  records,
  isLoading,
}: DnsTableProps) {
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteAllConfirmed, setDeleteAllConfirmed] = useState(false);
  const t = useTranslations();
  
  const {
    addRecord,
    addRecords,
    updateRecord,
    deleteRecord,
    deleteRecords,
    deleteAllRecords,
    refresh,
  } = useDnsRecords();
  
  // Файлы
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Фильтры
  const [domainFilter, setDomainFilter] = useState("");
  const [addressFilter, setAddressFilter] = useState("");
  
  // Сортировка
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Фильтрация и сортировка записей
  const filteredAndSortedRecords = (() => {
    let result = [...records];
    
    // Фильтрация
    if (domainFilter) {
      const filter = domainFilter.toLowerCase();
      result = result.filter((r) => r.domain.toLowerCase().includes(filter));
    }
    if (addressFilter) {
      const filter = addressFilter.toLowerCase();
      result = result.filter((r) => r.address.toLowerCase().includes(filter));
    }
    
    // Сортировка
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField].toLowerCase();
        const bVal = b[sortField].toLowerCase();
        const comparison = aVal.localeCompare(bVal);
        return sortDirection === "asc" ? comparison : -comparison;
      });
    }
    
    return result;
  })();

  // Учитываем только отфильтрованные записи для "выбрать все"
  const filteredKeys = new Set(filteredAndSortedRecords.map(getRecordKey));
  const selectedInFiltered = [...selectedRecords].filter(key => filteredKeys.has(key));
  const allSelected = filteredAndSortedRecords.length > 0 && selectedInFiltered.length === filteredAndSortedRecords.length;
  const someSelected = selectedInFiltered.length > 0 && selectedInFiltered.length < filteredAndSortedRecords.length;

  const hasFilters = domainFilter || addressFilter;
  const clearFilters = () => {
    setDomainFilter("");
    setAddressFilter("");
  };

  const handleSort = (field: "domain" | "address") => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: "domain" | "address") => {
    if (sortField !== field) {
      return <ArrowUpDown className="size-4 ml-1 opacity-50" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="size-4 ml-1" /> 
      : <ArrowDown className="size-4 ml-1" />;
  };

  const handleSelectRecord = (record: DnsRecord, checked: boolean) => {
    const key = getRecordKey(record);
    const newSelected = new Set(selectedRecords);
    if (checked) {
      newSelected.add(key);
    } else {
      newSelected.delete(key);
    }
    setSelectedRecords(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Выбираем только отфильтрованные записи
      setSelectedRecords(new Set(filteredAndSortedRecords.map(getRecordKey)));
    } else {
      setSelectedRecords(new Set());
    }
  };

  const handleEdit = async (
    oldDomain: string,
    oldAddress: string,
    newDomain: string,
    newAddress: string
  ) => {
    try {
      await updateRecord(oldDomain, oldAddress, newDomain, newAddress);
      toast.success(t.dnsRecordUpdated, {
        description: `${newDomain} → ${newAddress}`,
      });
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToUpdateRecord,
      });
      throw err;
    }
  };

  const handleDelete = async (record: DnsRecord) => {
    const key = getRecordKey(record);
    setDeletingKey(key);
    try {
      await deleteRecord(record.domain, record.address);
      toast.success(t.dnsRecordDeleted, {
        description: `${record.domain} → ${record.address}`,
      });
      const newSelected = new Set(selectedRecords);
      newSelected.delete(key);
      setSelectedRecords(newSelected);
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToDeleteRecord,
      });
    } finally {
      setDeletingKey(null);
    }
  };

  const handleDeleteSelected = async () => {
    setIsDeleting(true);
    try {
      const recordsToDelete = records.filter((r) =>
        selectedRecords.has(getRecordKey(r))
      );
      await deleteRecords(recordsToDelete);
      toast.success(t.dnsRecordsDeleted(recordsToDelete.length));
      setSelectedRecords(new Set());
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToDeleteRecords,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAll = async () => {
    setIsDeleting(true);
    try {
      await deleteAllRecords();
      toast.success(t.allDnsRecordsDeleted);
      setSelectedRecords(new Set());
      setDeleteAllConfirmed(false);
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToDeleteRecords,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Экспорт DNS записей в JSON
  const handleExport = () => {
    if (records.length === 0) {
      toast.error(t.noRecordsToExport);
      return;
    }

    // Массив объектов { address, domain }
    const keeneticFormat = records.map((r) => ({
      address: r.address,
      domain: r.domain,
    }));

    const blob = new Blob([JSON.stringify(keeneticFormat, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dns-records-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(t.exported(records.length));
  };

  // Импорт DNS записей из JSON файла
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Показываем тост со спиннером
    const importToastId = toast.loading(t.importingRecords);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Проверяем формат: массив объектов с address и domain
      if (!Array.isArray(data)) {
        throw new Error(t.fileMustContainArray);
      }

      const newRecords: DnsRecord[] = [];
      const existingKeys = new Set(records.map((r) => `${r.domain}:${r.address}`));

      for (const item of data) {
        if (!item.domain || !item.address) {
          continue; // Пропускаем некорректные записи
        }

        const key = `${item.domain}:${item.address}`;
        if (!existingKeys.has(key)) {
          newRecords.push({ domain: item.domain, address: item.address });
          existingKeys.add(key);
        }
      }

      if (newRecords.length === 0) {
        toast.dismiss(importToastId);
        toast.info(t.noNewRecordsToImport, {
          description: t.noNewRecordsToImportDesc,
        });
        return;
      }

      await addRecords(newRecords);
      toast.success(t.imported(newRecords.length));
    } catch (err) {
      toast.dismiss(importToastId);
      toast.error(t.importError, {
        description: err instanceof Error ? err.message : t.invalidFileFormat,
      });
    } finally {
      toast.dismiss(importToastId);
      // Сбрасываем input чтобы можно было выбрать тот же файл повторно
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCreate = async (
    _oldDomain: string,
    _oldAddress: string,
    newDomain: string,
    newAddress: string
  ) => {
    try {
      await addRecord(newDomain, newAddress);
      toast.success(t.dnsRecordAdded, {
        description: `${newDomain} → ${newAddress}`,
      });
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToAddRecord,
      });
      throw err;
    }
  };

  const handleCreateMultiple = async (newRecords: DnsRecord[]) => {
    try {
      await addRecords(newRecords);
      toast.success(t.dnsRecordsAdded(newRecords.length));
    } catch (err) {
      toast.error(t.error, {
        description: err instanceof Error ? err.message : t.failedToAddRecords,
      });
      throw err;
    }
  };

  const handleRefresh = () => {
    refresh();
    toast.info(t.refreshing);
  };


  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>{t.domain}</TableHead>
              <TableHead>{t.ipAddress}</TableHead>
              <TableHead className="w-[100px]">{t.actions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[200px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-[120px]" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-[80px]" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 py-6">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handleRefresh} title={t.refresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleExport}
            disabled={records.length === 0}
            title={t.exportJson}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => fileInputRef.current?.click()}
            title={t.importJson}
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <DnsFormDialog
            mode="create"
            existingRecords={records}
            onSubmit={handleCreate}
            onSubmitMultiple={handleCreateMultiple}
          />
        </div>
      </div>
    
    
      <div className="space-y-4">
        {/* Панель массовых действий */}
        {selectedRecords.size > 0 && (
          <div className="flex items-center justify-between rounded-md border bg-muted/50 p-3">
            <span className="text-sm text-muted-foreground">
              {t.selectedRecords} {selectedRecords.size}
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="size-4" />
                  {t.deleteSelected}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.deleteSelectedTitle}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.deleteSelectedDescription(selectedRecords.size)}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSelected}
                    variant="destructive"
                  >
                    {t.delete}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-xs min-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.filterByDomain}
              value={domainFilter}
              onChange={(e) => setDomainFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="relative flex-1 max-w-xs min-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.filterByIp}
              value={addressFilter}
              onChange={(e) => setAddressFilter(e.target.value)}
              className="pl-8"
            />
          </div>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" />
              {t.resetFilters}
            </Button>
          )}
          {hasFilters && (
            <span className="text-sm text-muted-foreground">
              {t.showing} {filteredAndSortedRecords.length} {t.of} {records.length}
            </span>
          )}
        </div>

        {/* Таблица */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected}
                    ref={(ref) => {
                      if (ref) {
                        (ref as unknown as HTMLInputElement).indeterminate = someSelected;
                      }
                    }}
                    onCheckedChange={handleSelectAll}
                    aria-label={t.selectAll}
                  />
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort("domain")}
                  >
                    {t.domain}
                    {getSortIcon("domain")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 hover:bg-transparent"
                    onClick={() => handleSort("address")}
                  >
                    {t.ipAddress}
                    {getSortIcon("address")}
                  </Button>
                </TableHead>
                <TableHead className="w-[100px]">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedRecords.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {hasFilters
                      ? t.noRecordsFiltered
                      : t.noRecords}
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedRecords.map((record) => {
                  const key = getRecordKey(record);
                  const isSelected = selectedRecords.has(key);
                  return (
                    <TableRow key={key} data-state={isSelected ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                          handleSelectRecord(record, checked as boolean)
                        }
                        aria-label={t.selectRecord(record.domain)}
                      />
                    </TableCell>
                    <TableCell>{record.domain}</TableCell>
                    <TableCell>{record.address}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DnsEditButton record={record} existingRecords={records} onSubmit={handleEdit} />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8"
                              disabled={deletingKey === key}
                              title={t.delete}
                            >
                              <Trash2 color="var(--destructive)"/>
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.deleteRecordTitle}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.deleteRecordDescription(record.domain, record.address)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(record)}
                                variant="destructive"
                              >
                                {t.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Кнопка удалить все */}
        {records.length > 0 && (
          <div className="flex justify-between items-center">
            {!isLoading && records.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {t.totalRecords}: {records.length}
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <AlertTriangle className="size-4" />
                  {t.deleteAllRecords}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="size-4" />
                    {t.deleteAllTitle}
                  </AlertDialogTitle>
                  <div className="text-muted-foreground text-sm space-y-4">
                    <p>
                      {t.deleteAllDescription(records.length)}
                    </p>
                    <div className="flex items-center space-x-2 rounded-md border border-destructive/50 bg-destructive/10 p-3">
                      <Checkbox
                        id="confirm-delete-all"
                        className="data-[state=checked]:bg-destructive data-[state=checked]:border-destructive dark:data-[state=checked]:bg-destructive"
                        checked={deleteAllConfirmed}
                        onCheckedChange={(checked) =>
                          setDeleteAllConfirmed(checked as boolean)
                        }
                      />
                      <Label
                        htmlFor="confirm-delete-all"
                        className="text-sm font-medium text-destructive"
                      >
                        {t.deleteAllConfirmLabel}
                      </Label>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteAllConfirmed(false)}>
                    {t.cancel}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    disabled={!deleteAllConfirmed || isDeleting}
                    variant="destructive"
                  >
                    {isDeleting ? t.deleting : t.deleteAll}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>
    </div>
  );
}
