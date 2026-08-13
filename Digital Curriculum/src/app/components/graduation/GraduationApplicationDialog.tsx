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

/**
 * "09:00" → "9:00 AM".
 *
 * `<input type="time">` renders in the browser's locale, so the same field
 * shows 24-hour on some machines and 12-hour on others — which is what testers
 * meant by "the time format was a little confusing". Everything we echo back is
 * spelled out in 12-hour with the timezone attached, so what you picked is
 * never ambiguous regardless of what the picker itself displays.
 */
function to12Hour(hhmm: string): string {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return "";
  let hours = parseInt(m[1], 10);
  if (Number.isNaN(hours)) return "";
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${m[2]} ${suffix}`;
}

/** Plain-English readback of a slot, or null until it is complete. */
function slotSummary(slot: AvailabilitySlot): string | null {
  if (!slot.date || !slot.startTime || !slot.endTime) return null;
  const from = to12Hour(slot.startTime);
  const until = to12Hour(slot.endTime);
  if (!from || !until) return null;
  return `You're free on ${format(slot.date, "EEEE, MMMM d")} between ${from} and ${until} ET.`;
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
          <DialogTitle>Alumni Application — When are you free?</DialogTitle>
          <DialogDescription>
            You're telling us when you're available. You are not booking a meeting yet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Testers submitted this without understanding what they were filling
              in: "I was confused about what the 3 slots were for". The three
              boxes are alternative windows, only one of which becomes a
              meeting — so say that before they start, in order. */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-foreground mb-2">How this works</p>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
              <li>
                Give us up to <strong className="text-foreground">three separate windows</strong>{" "}
                when you could meet. They're alternatives, not three meetings — more options just
                makes it easier to find one that suits you both.
              </li>
              <li>
                Each window is a stretch of time you're free, like 9:00 AM to 11:00 AM. The Alumni
                Manager books a meeting <strong className="text-foreground">inside</strong> one of
                them, so give a wider window if you can.
              </li>
              <li>
                We email you the one confirmed date and time, with a calendar invite you can add in
                a tap. Nothing is booked until then.
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              All times are Eastern Time (ET), weekdays only, between 9:00 AM and 5:00 PM.
            </p>
          </div>

          {/* Availability Slots */}
          <div className="space-y-4">
            {availabilitySlots.map((slot, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">
                    Availability window {index + 1} of 3
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
                    <Label>I'm free from *</Label>
                    <Input
                      type="time"
                      value={slot.startTime}
                      min={BUSINESS_START}
                      max={BUSINESS_END}
                      onChange={(e) => updateSlot(index, "startTime", e.target.value)}
                    />
                    {slot.startTime && (
                      <p className="text-xs text-muted-foreground">{to12Hour(slot.startTime)} ET</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>…until *</Label>
                    <Input
                      type="time"
                      value={slot.endTime}
                      min={slot.startTime || BUSINESS_START}
                      max={BUSINESS_END}
                      onChange={(e) => updateSlot(index, "endTime", e.target.value)}
                    />
                    {slot.endTime && (
                      <p className="text-xs text-muted-foreground">{to12Hour(slot.endTime)} ET</p>
                    )}
                  </div>
                </div>
                {/* Reads the finished window back in words, so nobody submits a
                    24-hour value they read as something else. */}
                {slotSummary(slot) ? (
                  <p className="text-sm text-foreground bg-accent/10 border border-accent/20 rounded-md px-3 py-2">
                    ✓ {slotSummary(slot)}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Pick a date and a start and end time. Weekdays only, 9:00 AM – 5:00 PM ET.
                  </p>
                )}
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
                {availabilitySlots.length === 0
                  ? "Add your first availability window"
                  : `Add another option (${availabilitySlots.length} of 3 added)`}
              </Button>
            )}
            {availabilitySlots.length === 1 && (
              <p className="text-xs text-muted-foreground text-center">
                One window is enough, but two or three alternatives get you booked sooner.
              </p>
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
