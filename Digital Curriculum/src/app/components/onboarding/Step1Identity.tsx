import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

interface Step1IdentityProps {
  identityData: {
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    cohort_id?: string;
    not_in_cohort?: boolean;
  };
  onUpdate: (data: {
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    cohort_id?: string;
    not_in_cohort?: boolean;
  }) => void;
  onNext: () => void;
}

export function Step1Identity({ identityData, onUpdate, onNext }: Step1IdentityProps) {
  const [firstName, setFirstName] = useState(identityData.first_name || "");
  const [lastName, setLastName] = useState(identityData.last_name || "");
  const [city, setCity] = useState(identityData.city || "");
  const [state, setState] = useState(identityData.state || "");
  const [cohortId, setCohortId] = useState(identityData.cohort_id || "");
  const [notInCohort, setNotInCohort] = useState(identityData.not_in_cohort || false);

  const handleUpdate = () => {
    onUpdate({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      city: city.trim(),
      state: state.trim(),
      cohort_id: notInCohort ? undefined : cohortId.trim() || undefined,
      not_in_cohort: notInCohort,
    });
  };

  const handleCohortChange = (value: string) => {
    const isNotInCohort = value === "not_in_cohort";
    setNotInCohort(isNotInCohort);
    if (isNotInCohort) {
      setCohortId("");
    }
    // Update will be called when user clicks Continue
  };

  const canContinue =
    firstName.trim() !== "" &&
    lastName.trim() !== "" &&
    city.trim() !== "" &&
    state.trim() !== "" &&
    (notInCohort || cohortId.trim() !== "");

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Step 1: Identity + Location</h1>
        <p className="text-muted-foreground">Please provide your basic information (required)</p>
      </div>

      <Card className="p-6 space-y-6">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="text-foreground">
              First Name *
            </Label>
            <Input
              id="firstName"
              type="text"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="text-foreground">
              Last Name *
            </Label>
            <Input
              id="lastName"
              type="text"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Location fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-foreground">
              City *
            </Label>
            <Input
              id="city"
              type="text"
              placeholder="Cincinnati"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className="text-foreground">
              State (or Metro) *
            </Label>
            <Input
              id="state"
              type="text"
              placeholder="Ohio"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Cohort selection */}
        <div className="space-y-4">
          <Label className="text-foreground">Cohort *</Label>
          <RadioGroup
            value={notInCohort ? "not_in_cohort" : "in_cohort"}
            onValueChange={handleCohortChange}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="in_cohort" id="in_cohort" />
              <Label htmlFor="in_cohort" className="cursor-pointer text-foreground">
                I am in a cohort
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="not_in_cohort" id="not_in_cohort" />
              <Label htmlFor="not_in_cohort" className="cursor-pointer text-foreground">
                Not in a cohort
              </Label>
            </div>
          </RadioGroup>

          {!notInCohort && (
            <div className="space-y-2 pl-6">
              <Label htmlFor="cohortId" className="text-foreground">
                Cohort ID *
              </Label>
              <Input
                id="cohortId"
                type="text"
                placeholder="Enter your cohort ID"
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                required
              />
            </div>
          )}
        </div>
      </Card>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={() => {
            handleUpdate();
            onNext();
          }}
          disabled={!canContinue}
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
