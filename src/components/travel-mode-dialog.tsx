
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { currencies, type Event } from '@/lib/data';
import type { DateRange } from "react-day-picker"
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { setTravelMode, disconnectTravelMode, getTravelMode } from '@/services/travel-mode-service';
import { useAuth } from './auth-provider';
import { getAllEvents } from '@/services/event-service';

interface TravelModeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TravelModeDialog({
  isOpen,
  onOpenChange,
}: TravelModeDialogProps) {
    const { user } = useAuth();
    const [events, setEvents] = useState<Event[]>([]);
    const [date, setDate] = useState<DateRange | undefined>()
    const [selectedEvent, setSelectedEvent] = useState<string>('');
    const [selectedCurrency, setSelectedCurrency] = useState<string>('');
    const { toast } = useToast();
    
    useEffect(() => {
        if (isOpen && user) {
            const userEvents = getAllEvents(user.uid);
            setEvents(userEvents);
        }
    }, [isOpen, user]);

    const handleConnect = () => {
        if (!selectedEvent || !selectedCurrency) {
            toast({
                title: "Missing Information",
                description: "Please select an event and a currency.",
                variant: "destructive"
            });
            return;
        }
        setTravelMode({
            isActive: true,
            currency: selectedCurrency,
            eventId: selectedEvent,
            duration: date
        });
        toast({
            title: "Travel Mode Activated",
            description: `Ready to track expenses for your trip in ${selectedCurrency}.`,
        });
        onOpenChange(false);
    }
    
    const handleDisconnect = () => {
        disconnectTravelMode();
        toast({
            title: "Travel Mode Deactivated",
        });
        onOpenChange(false);
    }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            // If the user closes the dialog without connecting, ensure the switch is off
            const travelModeState = getTravelMode();
            if (!travelModeState.isActive) {
                 window.dispatchEvent(new Event('travelModeChanged'));
            }
        }
        onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Activate Travel Mode</DialogTitle>
          <DialogDescription>
            Link to an event and set a currency for automatic conversions during
            your trip.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="event" className="text-right">
              Event
            </Label>
            <Select onValueChange={setSelectedEvent}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>{event.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="currency" className="text-right">
              Currency
            </Label>
            <Select onValueChange={setSelectedCurrency}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select travel currency" />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="end-date" className="text-right">
              Duration
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "LLL dd, y")} -{" "}
                        {format(date.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(date.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range (optional)</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleDisconnect}>Disconnect</Button>
          <Button type="submit" onClick={handleConnect}>Connect</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
