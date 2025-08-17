
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
import { EditCategoryDialog } from '@/components/edit-category-dialog';
import { AddCategoryDialog } from '@/components/add-category-dialog';
import { deleteCategory, getAllCategories, getCategoryDepth } from '@/services/category-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import type { Category } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';

export default function CategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const cats = getAllCategories(user.uid);
        setCategories(cats);
    } catch (error) {
        console.error("Error fetching categories:", error);
        toast({ title: "Error", description: "Could not fetch categories."});
    } finally {
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (user) {
        fetchData();
    }
     const handleDataChange = () => {
        if(user) fetchData();
    };
    window.addEventListener('categoriesUpdated', handleDataChange);
    return () => window.removeEventListener('categoriesUpdated', handleDataChange);
  }, [user, fetchData]);


  const getCategoryName = (id: string | null): string => {
    if (!id) return '';
    const parent = categories.find((c) => c.id === id);
    return parent ? parent.name : '';
  };

  const getCategoryPath = (categoryId: string): string => {
    let path = [];
    let current: Category | undefined = categories.find(c => c.id === categoryId);
    while (current) {
        path.unshift(current.name);
        current = categories.find(c => c.id === current!.parentId);
    }
    return path.join(' / ');
  }

  const handleEditClick = (category: Category) => {
    setSelectedCategory(category);
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (categoryId: string) => {
    if (!user) return;
    try {
      deleteCategory(user.uid, categoryId);
      toast({
        title: "Category Deleted",
        description: "The category and its sub-categories have been deleted.",
      });
      fetchData(); // Refresh data
    } catch (error: any) {
       toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const sortedCategories = [...categories].sort((a, b) => {
    const pathA = getCategoryPath(a.id);
    const pathB = getCategoryPath(b.id);
    return pathA.localeCompare(pathB);
  });

  const getIndentation = (category: Category) => {
    let level = 0;
    let current = category;
    while(current.parentId) {
        level++;
        const parent = categories.find(c => c.id === current.parentId);
        if (!parent) break;
        current = parent;
    }
    return { paddingLeft: `${level * 1.5}rem` };
  }
  
  const handleDialogClose = () => {
     fetchData();
  }
  
  if (isLoading) {
    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-10 w-36" />
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead><Skeleton className="h-6 w-32" /></TableHead>
                            <TableHead><Skeleton className="h-6 w-24" /></TableHead>
                            <TableHead><Skeleton className="h-6 w-48" /></TableHead>
                            <TableHead className="text-right"><Skeleton className="h-6 w-24" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {[...Array(5)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
  }

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Categories</h2>
            <p className="text-muted-foreground">
              Organize your income and expenses with up to 3 levels.
            </p>
          </div>
          <div className="flex items-center space-x-2">
              <Button onClick={() => setIsAddDialogOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Category
              </Button>
          </div>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Parent Category</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCategories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2" style={getIndentation(category)}>
                      <span className="text-lg">{category.icon}</span>
                      <span>{category.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.type === 'income' ? 'default' : 'secondary'} className={category.type === 'income' ? 'bg-accent text-accent-foreground' : ''}>
                      {category.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {category.parentId ? (
                       <Badge variant="outline">{getCategoryName(category.parentId)}</Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                     <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditClick(category)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive">
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                </AlertDialogTrigger>
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the category and all its sub-categories. 
                                Transactions associated with this category will not be deleted but will become uncategorized.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteClick(category.id)}>Continue</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                     </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <EditCategoryDialog 
        isOpen={isEditDialogOpen} 
        onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) handleDialogClose();
        }} 
        category={selectedCategory}
        allCategories={categories}
      />
      <AddCategoryDialog
        isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) handleDialogClose();
        }}
        allCategories={categories}
      />
    </>
  );
}
