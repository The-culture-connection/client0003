import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "../ui/utils";
import { useAuth } from "../auth/AuthProvider";
import { submitGraduationApplication, type AvailabilitySlot } from "../../lib/graduation";

interface GraduationApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

/** Business hours for pitch meetings: Mon–Fri, 9am–5pm ET. */
const BUSINESS_START = "09:00";
const BUSINESS_END = "17:00";

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export function GraduationApplicationDialog({
  open,
  onOpenChange,
  onSuccess,
}: GraduationApplicationDialogProps) {
  const { user } = useAuth();
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addAvailabilitySlot = () => {
    if (availabilitySlots.length >= 3) {
      setError("You can add a maximum of 3 meeting time options.");
      return;
    }
    // Default to the next business day so the pre-filled date is always valid.
    const defaultDate = new Date();
    while (isWeekend(defaultDate)) {
      defaultDate.setDate(defaultDate.getDate() + 1);
    }
    setAvailabilitySlots([
      ...availabilitySlots,
      {
        date: defaultDate,
        startTime: "",
        endTime: "",
      },
    ]);
    setError("");
  };

  const removeAvailabilitySlot = (index: number) => {
    setAvailabilitySlots(availabilitySlots.filter((_, i) => i !== index));
  };

  const updateSlot = (index: number, field: keyof AvailabilitySlot, value: Date | string) => {
    const updated = [...availabilitySlots];
    updated[index] = { ...updated[index], [field]: value };
    setAvailabilitySlots(updated);
    setError("");
  };

  const handleSubmit = async () => {
    if (availabilitySlots.length === 0) {
      setError("Please add at least one meeting time option.");
      return;
    }

    // Validate all slots
    for (let i = 0; i < availabilitySlots.length; i++) {
      const slot = availabilitySlots[i];
      if (!slot.date) {
        setError(`Option ${i + 1}: Please select a date.`);
        return;
      }
      if (!slot.startTime || !slot.endTime) {
        setError(`Option ${i + 1}: Please provide both start and end times.`);
        return;
      }
      if (slot.startTime >= slot.endTime) {
        setError(`Option ${i + 1}: End time must be after start time.`);
        return;
      }
      if (slot.startTime < BUSINESS_START || slot.endTime > BUSINESS_END) {
        setError(`Option ${i + 1}: Times must be within business hours (9:00 AM – 5:00 PM ET).`);
        return;
      }
      if (isWeekend(slot.date)) {
        setError(`Option ${i + 1}: Please choose a weekday (Mon–Fri).`);
        return;
      }

      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const slotDate = new Date(slot.date);
      slotDate.setHours(0, 0, 0, 0);
      if (slotDate < today) {
        setError(`Option ${i + 1}: Date cannot be in the past.`);
        return;
      }
    }

    if (!user) {
      setError("You must be logged in to apply.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await submitGraduationApplication(
        user.uid,
        user.email || "",
        user.displayName || user.email || "User",
        availabilitySlots
      );

      onSuccess?.();
      onOpenChange(false);
      
      // Reset form
      setAvailabilitySlots([]);
    } catch (err: any) {
      console.error("Error submitting application:", err);
      setError(err.message || "Failed to submit application. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alumni Application — Add Your Availability</DialogTitle>
          <DialogDescription>
            Choose up to three times that work for you for your pitch meeting, during business
            hours (Mon–Fri, 9am–5pm ET). The Alumni Manager will confirm one of them — put the
            confirmed meeting on your calendar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Availability Slots */}
          <div className="space-y-4">
            {availabilitySlots.map((slot, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Preferred meeting time — option {index + 1}
                  </Label>
                  {availabilitySlots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAvailabilitySlot(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Date Picker */}
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full justify-start text-left font-normal",
                          !slot.date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {slot.date ? format(slot.date, "PPP") : "Pick a date"}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4}>
                      <Calendar
                        mode="single"
                        selected={slot.date}
                        onSelect={(date) => {
                          if (date) updateSlot(index, "date", date);
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          // Business days only (Mon–Fri), no past dates.
                          return date < today || isWeekend(date);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Available from *</Label>
                    <Input
                      type="time"
                      value={slot.startTime}
                      min={BUSINESS_START}
                      max={BUSINESS_END}
                      onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Available until *</Label>
                    <Input
                      type="time"
                      value={slot.endTime}
                      min={slot.startTime || BUSINESS_START}
                      max={BUSINESS_END}
                      onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Business hours only: Mon–Fri, 9:00 AM – 5:00 PM ET.
                </p>
              </div>
            ))}

            {availabilitySlots.length < 3 && (
              <Button
                type="button"
                variant="outline"
                onClick={addAvailabilitySlot}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add a meeting time option ({availabilitySlots.length}/3)
              </Button>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={availabilitySlots.length === 0 || submitting}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
