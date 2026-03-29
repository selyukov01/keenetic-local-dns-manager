"use client";

import useSWR from "swr";
import type { DnsRecord, ApiResponse, DnsRecordsResponse } from "@/types/dns";
import { useDemoCredentials, getDemoHeaders } from "@/contexts/demo-context";
import { useAppMode } from "@/contexts/app-mode-context";

export function useDnsRecords() {
  const { mode } = useAppMode();
  const { credentials, isConfigured } = useDemoCredentials();
  
  // Создаём fetcher с учётом demo режима
  const fetcher = async (url: string) => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(mode === "demo" ? getDemoHeaders(credentials) : {}),
    };
    
    const res = await fetch(url, { headers });
    const data = await res.json();
    
    if (!res.ok) {
      const error = new Error(data.error || "Ошибка загрузки данных");
      (error as Error & { needsSetup?: boolean }).needsSetup = data.needsSetup;
      throw error;
    }
    
    return data;
  };

  // В demo режиме не делаем запрос пока нет credentials
  const shouldFetch = mode !== "demo" || isConfigured;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<DnsRecordsResponse>>(
    shouldFetch ? "/api/dns" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  const records: DnsRecord[] = data?.data?.records || [];
  const needsSetup = mode === "demo" 
    ? !isConfigured 
    : (error as Error & { needsSetup?: boolean })?.needsSetup || false;

  // Хелпер для создания заголовков
  const getHeaders = (): HeadersInit => ({
    "Content-Type": "application/json",
    ...(mode === "demo" ? getDemoHeaders(credentials) : {}),
  });

  const addRecord = async (domain: string, address: string) => {
    const res = await fetch("/api/dns", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ domain, address }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось добавить запись");
    }

    await mutate();
    return result;
  };

  const addRecords = async (newRecords: DnsRecord[]) => {
    const res = await fetch("/api/dns", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ records: newRecords }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось добавить записи");
    }

    await mutate();
    return result;
  };

  const updateRecord = async (
    oldDomain: string,
    oldAddress: string,
    newDomain: string,
    newAddress: string
  ) => {
    const res = await fetch(
      `/api/dns/${encodeURIComponent(oldDomain)}`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ oldAddress, domain: newDomain, address: newAddress }),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось обновить запись");
    }

    await mutate();
    return result;
  };

  const deleteRecord = async (domain: string, address: string) => {
    const res = await fetch(
      `/api/dns/${encodeURIComponent(domain)}`,
      {
        method: "DELETE",
        headers: getHeaders(),
        body: JSON.stringify({ address }),
      }
    );

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось удалить запись");
    }

    await mutate();
    return result;
  };

  const deleteRecords = async (recordsToDelete: DnsRecord[]) => {
    const res = await fetch("/api/dns", {
      method: "DELETE",
      headers: getHeaders(),
      body: JSON.stringify({ records: recordsToDelete }),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось удалить записи");
    }

    await mutate();
    return result;
  };

  const deleteAllRecords = async () => {
    const res = await fetch("/api/dns?all=true", {
      method: "DELETE",
      headers: getHeaders(),
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Не удалось удалить все записи");
    }

    await mutate();
    return result;
  };

  const refresh = () => mutate();

  return {
    records,
    isLoading,
    error,
    needsSetup,
    addRecord,
    addRecords,
    updateRecord,
    deleteRecord,
    deleteRecords,
    deleteAllRecords,
    refresh,
  };
}
