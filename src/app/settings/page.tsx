
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { currencies } from "@/lib/data"
import { FileUp, Download, UploadCloud, Moon, Sun, Trash2, HardDriveDownload, HardDriveUpload, KeyRound, CheckCircle, XCircle } from "lucide-react"
import { getDefaultCurrency, setDefaultCurrency } from "@/services/settings-service";
import { useToast } from "@/hooks/use-toast";
import { addTransactions, deleteAllTransactions as deleteAllTransactionsService, convertAllTransactions } from "@/services/transaction-service";
import { convertAllWallets, getAllWallets, setDefaultWallet, getDefaultWallet } from "@/services/wallet-service";
import { convertAllDebts, getAllDebts } from "@/services/debt-service";
import { ConfirmCurrencyChangeDialog } from "@/components/confirm-currency-change-dialog";
import { updateUserProfile, getCurrentUser } from "@/services/user-service";
import type { Transaction, Category, Wallet, Debt, Event } from "@/lib/data";
import * as XLSX from 'xlsx';
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { DeleteAllTransactionsDialog } from "@/components/delete-all-transactions-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { getTheme, setTheme as setAppTheme } from "@/services/theme-service";
import { getTravelMode, setTravelMode } from "@/services/travel-mode-service";
import { addCategory, getAllCategories, deleteAllCategories } from "@/services/category-service";
import { DeleteAllCategoriesDialog } from "@/components/delete-all-categories-dialog";
import { getExchangeRateApiKey, setExchangeRateApiKey } from "@/services/api-key-service";
import { useAuth } from "@/components/auth-provider";
import { getAllEvents } from "@/services/event-service";
import { verifyApiKey } from "@/ai/flows/verify-api-key-flow";


export default function SettingsPage() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [currentDefaultCurrency, setCurrentDefaultCurrency] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDeleteAllTransactionsDialogOpen, setIsDeleteAllTransactionsDialogOpen] = useState(false);
  const [isDeleteAllCategoriesDialogOpen, setIsDeleteAllCategoriesDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCategoriesFile, setImportCategoriesFile] = useState<File | null>(null);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [exchangeRateKey, setExchangeRateKey] = useState('');
  const [keyVerificationStatus, setKeyVerificationStatus] = useState<'unverified' | 'verified' | 'invalid'>('unverified');
  const [isVerifyingKey, setIsVerifyingKey] = useState(false);
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    setIsClient(true);
    if (user) {
        setName(user.displayName || '');
        setEmail(user.email || '');
        getDefaultCurrency(user.uid).then(currency => {
            setCurrentDefaultCurrency(currency);
            setSelectedCurrency(currency);
        });
        getExchangeRateApiKey(user.uid).then(key => {
            setExchangeRateKey(key || '');
            if (key) {
                setKeyVerificationStatus('unverified');
            }
        });
    }
  }, [user]);

  const handleProfileSave = async () => {
    if (!user) return;
    try {
        await updateUserProfile({ displayName: name });
        toast({
        title: "Profile Saved",
        description: "Your name has been updated.",
        });
        window.dispatchEvent(new Event('profileUpdated'));
    } catch(e) {
        toast({
            title: "Error",
            description: "Could not save profile.",
            variant: "destructive"
        })
    }
  };

  const handleCurrencySaveClick = () => {
    if (selectedCurrency !== currentDefaultCurrency) {
      setIsConfirmDialogOpen(true);
    } else {
      toast({
        title: "No Changes",
        description: "The default currency is already set to " + selectedCurrency,
      });
    }
  };

  const handleConfirmation = async (conversionType: 'convert' | 'keep') => {
    if (!user) return;
    const oldCurrency = currentDefaultCurrency;
    
    if (conversionType === 'convert') {
      const apiKey = await getExchangeRateApiKey(user.uid);
      if (!apiKey) {
        toast({
          title: "API Key Required",
          description: "An ExchangeRate-API key is required for currency conversion. Please add one in the settings.",
          variant: "destructive",
        });
        return;
      }
      try {
        toast({
          title: "Conversion in Progress",
          description: "Please wait while we convert your data...",
        });
        await convertAllTransactions(user.uid, oldCurrency, selectedCurrency);
        await convertAllWallets(user.uid, oldCurrency, selectedCurrency);
        await convertAllDebts(user.uid, oldCurrency, selectedCurrency);
        toast({
          title: "Conversion Successful",
          description: `All financial data has been converted to ${selectedCurrency}.`,
        });
      } catch (error: any) {
        console.error("Conversion failed:", error);
        toast({
          title: "Conversion Failed",
          description: error.message || "Could not convert all data. Please try again.",
          variant: "destructive",
        });
        return; 
      }
    }
    
    await setDefaultCurrency(user.uid, selectedCurrency);
    setCurrentDefaultCurrency(selectedCurrency);
    
    toast({
      title: "Settings Saved",
      description: `Default currency set to ${selectedCurrency}.`,
    });
    window.location.reload();
  };

  const handleDownloadTemplate = () => {
    const headers = "No.,Category,Amount,Note,Wallet,Currency,Date,Event,Exclude Report";
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "import-template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCategoryTemplate = () => {
    const headers = "Category Name,Parent Category,Type";
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "category-import-template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = async () => {
    if (!user) return;
    const [allTransactions, allCategories, allEvents] = await Promise.all([
        getAllTransactions(user.uid),
        getAllCategories(user.uid),
        getAllEvents(user.uid),
    ]);

    const transactionData = allTransactions.map((t, index) => {
        const eventName = t.eventId ? allEvents.find(e => e.id === t.eventId)?.name || '' : '';
        return {
            'No.': index + 1,
            'Category': t.category,
            'Amount': t.amount,
            'Note': t.description,
            'Wallet': t.wallet,
            'Currency': t.currency,
            'Date': t.date,
            'Event': eventName,
            'Exclude Report': t.excludeFromReport ? 'true' : 'false',
        };
    });

    const categoryData = allCategories.map(c => ({
        'Category Name': c.name,
        'Parent Category': allCategories.find(p => p.id === c.parentId)?.name || '',
        'Type': c.type,
    }));

    const transactionsWs = XLSX.utils.json_to_sheet(transactionData);
    const categoriesWs = XLSX.utils.json_to_sheet(categoryData);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, transactionsWs, "Transactions");
    XLSX.utils.book_append_sheet(wb, categoriesWs, "Categories");

    XLSX.writeFile(wb, "expensewise-export.xlsx");

    toast({
        title: "Export Successful",
        description: "Your data has been exported."
    });
  };
  
   const handleExportCategories = async () => {
    if (!user) return;
    const allCategories = await getAllCategories(user.uid);
    const categoryData = allCategories.map(c => ({
      'Category Name': c.name,
      'Parent Category': allCategories.find(p => p.id === c.parentId)?.name || '',
      'Type': c.type,
    }));
    const worksheet = XLSX.utils.json_to_sheet(categoryData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "categories-export.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Categories Exported",
      description: "Your categories have been exported to a CSV file.",
    });
  };

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) return;

    const [allCategories, allWallets, allEvents, defaultCurrency] = await Promise.all([
        getAllCategories(user.uid),
        getAllWallets(user.uid),
        getAllEvents(user.uid),
        getDefaultCurrency(user.uid),
    ]);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rows = text.split('\n').slice(1);
      const newTransactions: Omit<Transaction, 'id' | 'userId'>[] = [];

      try {
        const walletNames = new Set(allWallets.map(w => w.name.toLowerCase()));
        const currencyCodes = new Set(currencies.map(c => c.toLowerCase()));

        rows.forEach((row, index) => {
          if (!row.trim()) return;
          const columns = row.split(',').map(c => c.trim());
          const rowNum = index + 2;

          if (columns.length < 7) {
            throw new Error(`Row ${rowNum} is missing columns.`);
          }
          
          const [no, category, amountStr, note, wallet, currency, dateString, eventName, excludeReport] = columns;
          
          const categoryObj = allCategories.find(c => c.name.toLowerCase() === category.toLowerCase());
          const eventObj = eventName ? allEvents.find(ev => ev.name.toLowerCase() === eventName.toLowerCase()) : null;

          if (!categoryObj) {
            throw new Error(`Error on row ${rowNum}: Category '${category}' not found.`);
          }
          if (!walletNames.has(wallet.toLowerCase())) {
            throw new Error(`Error on row ${rowNum}: Wallet '${wallet}' not found.`);
          }
          if (currency && !currencyCodes.has(currency.toLowerCase())) {
             throw new Error(`Error on row ${rowNum}: Currency '${currency}' not found.`);
          }
          if (eventName && !eventObj) {
             throw new Error(`Error on row ${rowNum}: Event '${eventName}' not found.`);
          }

          const amount = parseFloat(amountStr);
          if (isNaN(amount)) {
            throw new Error(`Invalid amount on row ${rowNum}`);
          }
          
          if (categoryObj.type === 'expense' && amount >= 0) {
            throw new Error(`Error on row ${rowNum}: Expense amount must be negative.`);
          }

          if (categoryObj.type === 'income' && amount <= 0) {
            throw new Error(`Error on row ${rowNum}: Income amount must be positive.`);
          }
          
          if (!dateString) {
            throw new Error(`Date is missing on row ${rowNum}`);
          }

           const dateValue = new Date(dateString.trim().replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$2/$1/$3'));
          if (isNaN(dateValue.getTime())) {
             throw new Error(`Invalid time value on row ${rowNum}: "${dateString}". Please use a standard format like YYYY-MM-DD or MM/DD/YYYY.`);
          }
          
          const newTransaction: Omit<Transaction, 'id' | 'userId' | 'attachments'> = {
            category: category,
            amount: Math.abs(amount),
            type: categoryObj.type,
            description: note,
            wallet: wallet,
            currency: currency || defaultCurrency,
            date: dateValue.toISOString().split('T')[0],
            eventId: eventObj?.id,
            excludeFromReport: excludeReport?.toLowerCase() === 'true',
          };
          newTransactions.push(newTransaction as any);
        });

        await addTransactions(user.uid, newTransactions);

        toast({
          title: 'Import Successful',
          description: `${newTransactions.length} transactions have been imported.`,
        });
        setImportFile(null);
        const fileInput = document.getElementById('import-file') as HTMLInputElement;
        if(fileInput) fileInput.value = '';

      } catch (error: any) {
        toast({
          title: 'Import Failed',
          description: error.message || 'An unexpected error occurred during import.',
          variant: 'destructive',
        });
        setImportFile(null);
        const fileInput = document.getElementById('import-file') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
      }
    };
    reader.readAsText(importFile);
  };
  
  const handleImportCategories = async () => {
    if (!importCategoriesFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to import categories.',
        variant: 'destructive',
      });
      return;
    }
    if (!user) return;

    const allCategories = await getAllCategories(user.uid);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const rows = text.split('\n').slice(1);
      let importedCount = 0;

      try {
        for (const row of rows) {
          if (!row.trim()) continue;
          const [name, parentName, typeStr] = row.split(',').map(c => c.trim());
          const rowNum = rows.indexOf(row) + 2;

          if (!name || !typeStr) {
            throw new Error(`Row ${rowNum}: Missing category name or type.`);
          }
          
          const type = typeStr.toLowerCase() as 'income' | 'expense';
          if (type !== 'income' && type !== 'expense') {
            throw new Error(`Row ${rowNum}: Invalid type '${typeStr}'. Must be 'income' or 'expense'.`);
          }

          let parentId: string | null = null;
          if (parentName) {
            const parentCategory = allCategories.find(c => c.name.toLowerCase() === parentName.toLowerCase());
            if (!parentCategory) {
              throw new Error(`Row ${rowNum}: Parent category '${parentName}' not found.`);
            }
            parentId = parentCategory.id;
          }

          await addCategory(user.uid, {
            name,
            parentId,
            type,
            icon: '🤔' // Default icon
          });
          importedCount++;
        };

        toast({
          title: 'Import Successful',
          description: `${importedCount} categories have been imported.`,
        });

      } catch (error: any) {
         toast({
          title: 'Import Failed',
          description: error.message || 'An unexpected error occurred during category import.',
          variant: 'destructive',
        });
      } finally {
        setImportCategoriesFile(null);
        const fileInput = document.getElementById('import-categories-file') as HTMLInputElement;
        if(fileInput) fileInput.value = '';
        window.dispatchEvent(new Event('storage'));
      }
    };
    reader.readAsText(importCategoriesFile);
  };

  const handleBackup = async () => {
    if (!user) return;
    try {
      const [
        allTransactions, 
        allCategories, 
        allWallets, 
        allDebts, 
        allEvents,
        currentUser,
        defaultCurrency,
        theme,
        defaultWallet,
        travelMode
      ] = await Promise.all([
        getAllTransactions(user.uid),
        getAllCategories(user.uid),
        getAllWallets(user.uid),
        getAllDebts(user.uid),
        getAllEvents(user.uid),
        getCurrentUser(),
        getDefaultCurrency(user.uid),
        getTheme(),
        getDefaultWallet(user.uid),
        getTravelMode()
      ]);

      const settings = {
        defaultCurrency,
        theme,
        defaultWallet,
        travelMode,
      };

      const backupData = {
        transactions: allTransactions,
        categories: allCategories,
        wallets: allWallets,
        debts: allDebts,
        events: allEvents,
        user: { name: currentUser?.displayName, email: currentUser?.email },
        settings: settings,
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `expensewise-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Backup Successful",
        description: "All your data has been downloaded."
      });

    } catch (error) {
      console.error("Backup failed:", error);
      toast({
        title: "Backup Failed",
        description: "Could not create backup file. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleRestore = () => {
    if (!restoreFile || !user) {
      toast({
        title: 'No file or user',
        description: 'Please select a JSON backup file to restore and make sure you are logged in.',
        variant: 'destructive',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const text = e.target?.result as string;
            if (!text) throw new Error("File is empty.");
            
            const data = JSON.parse(text);

            if (!data.transactions || !data.categories || !data.wallets || !data.settings) {
                throw new Error("Invalid or corrupted backup file.");
            }

            toast({ title: "Restore in progress...", description: "Please wait."});
            await deleteAllTransactionsService(user.uid);
            await deleteAllCategories(user.uid);
            
            if (data.transactions) await addTransactions(user.uid, data.transactions.map((t: any) => ({...t, userId: user.uid})));
            if (data.categories) {
                for(const c of data.categories) {
                    await addCategory(user.uid, {...c, userId: user.uid});
                }
            }
            
            if (data.settings.defaultCurrency) await setDefaultCurrency(user.uid, data.settings.defaultCurrency);
            if (data.settings.theme) setAppTheme(data.settings.theme);
            if (data.settings.defaultWallet) await setDefaultWallet(user.uid, data.settings.defaultWallet);
            if (data.settings.travelMode && data.settings.travelMode.isActive) {
                setTravelMode(data.settings.travelMode);
            }

            if (data.user?.name) {
                await updateUserProfile({ displayName: data.user.name });
            }

            toast({
                title: "Restore Successful",
                description: "Your data has been restored. The page will now reload."
            });
            
            setTimeout(() => window.location.reload(), 2000);

        } catch (error: any) {
            console.error("Restore failed:", error);
            toast({
                title: 'Restore Failed',
                description: error.message || 'An unexpected error occurred during restore.',
                variant: 'destructive',
            });
        } finally {
            setRestoreFile(null);
            const fileInput = document.getElementById('restore-file') as HTMLInputElement;
            if(fileInput) fileInput.value = '';
        }
    };
    reader.readAsText(restoreFile);
  };
  
  const handleSaveApiKey = async () => {
    if (!user) return;
    await setExchangeRateApiKey(user.uid, exchangeRateKey);
    setKeyVerificationStatus('unverified');
    toast({
        title: 'API Key Saved',
        description: 'Your key has been saved. You can verify it now.',
    });
  }
  
  const handleVerifyApiKey = async () => {
    if (!user || !exchangeRateKey) return;
    setIsVerifyingKey(true);
    
    try {
        const result = await verifyApiKey({ apiKey: exchangeRateKey });

        if (result.isValid) {
            setKeyVerificationStatus('verified');
            toast({
                title: 'API Key Verified',
                description: 'Your ExchangeRate-API key is valid.',
            });
        } else {
            setKeyVerificationStatus('invalid');
            toast({
                title: 'Invalid API Key',
                description: result.error || 'Please check the key and try again.',
                variant: 'destructive',
            });
        }
    } catch (e: any) {
        setKeyVerificationStatus('invalid');
        console.error("API Key verification failed:", e);
        toast({
            title: 'Verification Failed',
            description: 'Could not connect to the verification service. Please try again later.',
            variant: 'destructive',
        });
    } finally {
        setIsVerifyingKey(false);
    }
  };


  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
            <p className="text-muted-foreground">
              Manage your account settings and preferences.
            </p>
          </div>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Update your personal information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled />
                </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleProfileSave}>Save</Button>
            </CardFooter>
          </Card>

           <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Customize the look and feel of the application.</CardDescription>
            </CardHeader>
            <CardContent>
              {isClient ? (
                <div className="flex items-center justify-between">
                    <Label htmlFor="theme-switch" className="flex items-center gap-2">
                        {theme === 'dark' ? <Moon /> : <Sun />}
                        <span>{theme === 'dark' ? 'Dark' : 'Light'} Mode</span>
                    </Label>
                    <Switch
                        id="theme-switch"
                        checked={theme === 'dark'}
                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    />
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 w-11" />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currency Settings</CardTitle>
              <CardDescription>Choose your default currency.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="default-currency">Default Currency</Label>
                <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                  <SelectTrigger className="w-full md:w-1/3">
                    <SelectValue placeholder="Select a currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button onClick={handleCurrencySaveClick}>Save</Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
                <CardTitle>API Integrations</CardTitle>
                <CardDescription>Manage API keys for third-party services.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <Label htmlFor="exchangerate-api-key" className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <KeyRound className="h-4 w-4" />
                            ExchangeRate-API Key
                        </span>
                        {keyVerificationStatus === 'verified' && <span className="text-xs text-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3"/> Verified</span>}
                        {keyVerificationStatus === 'invalid' && <span className="text-xs text-red-500 flex items-center gap-1"><XCircle className="h-3 w-3"/> Invalid</span>}
                        {keyVerificationStatus === 'unverified' && exchangeRateKey && <span className="text-xs text-muted-foreground">Unverified</span>}
                    </Label>
                    <Input 
                        id="exchangerate-api-key" 
                        type="password"
                        value={exchangeRateKey} 
                        onChange={(e) => {
                            setExchangeRateKey(e.target.value);
                            setKeyVerificationStatus('unverified');
                        }}
                        placeholder="Enter your API key"
                    />
                    <p className="text-xs text-muted-foreground">
                        Required for automatic currency conversion. Get a free key from <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer" className="underline">exchangerate-api.com</a>.
                    </p>
                </div>
            </CardContent>
             <CardFooter className="border-t px-6 py-4 flex justify-end gap-2">
              <Button onClick={handleSaveApiKey} variant="secondary">Save API Key</Button>
              <Button onClick={handleVerifyApiKey} disabled={isVerifyingKey || !exchangeRateKey}>
                {isVerifyingKey ? 'Verifying...' : 'Verify API Key'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction Migration</CardTitle>
              <CardDescription>
                Import transactions from CSV or export main data to XLSX.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-4 border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Import Transactions</h3>
                        <p className="text-sm text-muted-foreground">
                            Import transactions from a CSV template.
                        </p>
                         <Button variant="outline" onClick={handleDownloadTemplate} className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold">Export All Data</h3>
                        <p className="text-sm text-muted-foreground">
                            Export main data to a single .xlsx file.
                        </p>
                        <Button variant="outline" onClick={handleExport} className="w-full">
                            <UploadCloud className="mr-2 h-4 w-4" />
                           Export to XLSX
                        </Button>
                    </div>
               </div>
               <div className="space-y-2">
                <Label htmlFor="import-file">Upload CSV File for Import</Label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <Input id="import-file" type="file" accept=".csv" className="flex-1" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} />
                   <Button onClick={handleImport} disabled={!importFile} className="w-full sm:w-auto">
                     <FileUp className="mr-2 h-4 w-4" /> Import
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
                <CardTitle>Category Migration</CardTitle>
                <CardDescription>Import or export your category structure.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Import Categories</h3>
                        <p className="text-sm text-muted-foreground">
                            Import categories from a CSV template.
                        </p>
                         <Button variant="outline" onClick={handleDownloadCategoryTemplate} className="w-full">
                            <Download className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold">Export Categories</h3>
                        <p className="text-sm text-muted-foreground">
                            Export your categories to a CSV file.
                        </p>
                        <Button variant="outline" onClick={handleExportCategories} className="w-full">
                            <UploadCloud className="mr-2 h-4 w-4" />
                           Export to CSV
                        </Button>
                    </div>
               </div>
                 <div className="space-y-2">
                    <Label htmlFor="import-categories-file">Upload Category CSV</Label>
                    <div className="flex flex-col sm:flex-row items-stretch gap-2">
                        <Input id="import-categories-file" type="file" accept=".csv" className="flex-1" onChange={(e) => setImportCategoriesFile(e.target.files ? e.target.files[0] : null)} />
                        <Button onClick={handleImportCategories} disabled={!importCategoriesFile} className="w-full sm:w-auto">
                            <FileUp className="mr-2 h-4 w-4" /> Import
                        </Button>
                    </div>
                </div>
            </CardContent>
          </Card>


          <Card>
            <CardHeader>
              <CardTitle>Backup & Restore</CardTitle>
              <CardDescription>
                Save or load a complete snapshot of all application data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 border rounded-lg">
                  <div className="space-y-2">
                      <h3 className="font-semibold">Backup</h3>
                      <p className="text-sm text-muted-foreground">Download a single JSON file containing all your data and settings.</p>
                      <Button variant="default" onClick={handleBackup} className="w-full sm:w-auto">
                          <HardDriveDownload className="mr-2 h-4 w-4" />
                          Backup All Data
                      </Button>
                  </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="restore-file">Upload JSON for Restore</Label>
                <div className="flex flex-col sm:flex-row items-stretch gap-2">
                  <Input id="restore-file" type="file" accept=".json" className="flex-1" onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)} />
                   <Button onClick={handleRestore} disabled={!restoreFile} className="w-full sm:w-auto">
                    <HardDriveUpload className="mr-2 h-4 w-4" /> Restore
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>


           <Card className="border-destructive">
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>These actions are irreversible. Please be certain.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
                <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setIsDeleteAllTransactionsDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Transactions
                </Button>
                <Button variant="destructive" className="w-full sm:w-auto" onClick={() => setIsDeleteAllCategoriesDialogOpen(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete All Categories
                </Button>
            </CardContent>
          </Card>

        </div>
      </div>
      <ConfirmCurrencyChangeDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        oldCurrency={currentDefaultCurrency}
        newCurrency={selectedCurrency}
        onConfirm={handleConfirmation}
      />
       <DeleteAllTransactionsDialog
        isOpen={isDeleteAllTransactionsDialogOpen}
        onOpenChange={setIsDeleteAllTransactionsDialogOpen}
      />
      <DeleteAllCategoriesDialog
        isOpen={isDeleteAllCategoriesDialogOpen}
        onOpenChange={setIsDeleteAllCategoriesDialogOpen}
      />
    </>
  )
}
