import { useMemo, useRef, useState, type FormEvent } from "react";
import { Check, ChevronsUpDown, CircleCheck, LoaderCircle, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  collegeDirectory,
  OTHER_COLLEGE_ID,
  validateRegistration,
  webinars,
  type RegistrationValues,
} from "@/lib/webinarCatalog";

type FormValues = Omit<RegistrationValues, "idempotencyKey">;

type ApiError = {
  error?: string;
  fieldErrors?: Record<string, string>;
  retryable?: boolean;
};

type RegistrationSuccess = {
  registrationId: string;
  webinarId: string;
  whatsappGroupUrl: string;
};

const initialForm: FormValues = {
  fullName: "",
  email: "",
  mobile: "",
  collegeId: "",
  collegeName: "",
  department: "",
  yearOfStudy: "",
  webinarId: "",
  consent: false,
};

const years = [
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year",
  "Postgraduate Year 1",
  "Postgraduate Year 2",
  "Other / Graduated",
];

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-1 text-sm text-destructive" role="alert">
      {message}
    </p>
  ) : null;
}

const WebinarRegistration = () => {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collegePickerOpen, setCollegePickerOpen] = useState(false);
  const [success, setSuccess] = useState<RegistrationSuccess | null>(null);
  const idempotencyKey = useRef<string | null>(null);

  const selectedCollegeName = useMemo(() => {
    if (form.collegeId === OTHER_COLLEGE_ID) return "Other / College not listed";
    return collegeDirectory.colleges.find((college) => college.id === form.collegeId)?.name ?? "";
  }, [form.collegeId]);

  const updateField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    setErrors((previous) => {
      const next = { ...previous };
      delete next[field];
      if (field === "collegeId") delete next.collegeName;
      return next;
    });
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setSubmitError("");

    const key = idempotencyKey.current ?? crypto.randomUUID();
    idempotencyKey.current = key;
    const validation = validateRegistration({ ...form, idempotencyKey: key });
    if (validation.valid === false) {
      setErrors(validation.errors);
      idempotencyKey.current = null;
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/.netlify/functions/webinar-register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, idempotencyKey: key }),
      });
      const result = await response.json() as RegistrationSuccess | ApiError;

      if (!response.ok) {
        const failure = result as ApiError;
        setErrors(failure.fieldErrors ?? {});
        setSubmitError(failure.error ?? "We could not submit your registration.");
        if (response.status === 400 || failure.retryable === false) {
          idempotencyKey.current = null;
        }
        return;
      }

      const saved = result as RegistrationSuccess;
      const groupUrl = new URL(saved.whatsappGroupUrl);
      if (
        saved.webinarId !== form.webinarId ||
        groupUrl.protocol !== "https:" ||
        groupUrl.hostname !== "chat.whatsapp.com"
      ) {
        setSubmitError("Your registration was saved, but we could not safely open its group link. Please contact support.");
        idempotencyKey.current = key;
        return;
      }
      setSuccess(saved);
      idempotencyKey.current = null;
    } catch {
      setSubmitError("We could not confirm your registration. Retry this same form so we can safely check the same registration ID.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAfterSuccess = () => {
    setSuccess(null);
    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    idempotencyKey.current = null;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="relative isolate overflow-hidden px-4 pb-16 pt-32 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem] bg-gradient-to-b from-primary/10 via-accent/5 to-transparent" />
        <div className="pointer-events-none absolute -left-32 top-24 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 top-52 -z-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <section className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <span className="section-badge">
              <Video className="h-4 w-4" />
              CodeRi8 live learning
            </span>
            <h1 className="mt-5 text-3xl font-bold sm:text-4xl lg:text-5xl">
              Save your seat for a <span className="gradient-text">webinar</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Tell us a little about yourself and choose the session you want to attend.
              We’ll share the relevant WhatsApp group after your registration is saved.
            </p>
          </div>

          {success ? (
            <section
              className="glass-card mx-auto max-w-xl p-6 text-center sm:p-10"
              aria-labelledby="registration-success-heading"
              role="status"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CircleCheck className="h-8 w-8" />
              </div>
              <h2 id="registration-success-heading" className="mt-5 text-2xl font-bold">
                You’re registered!
              </h2>
              <p className="mt-2 text-muted-foreground">
                Your registration <span className="font-medium text-foreground">{success.registrationId}</span> has been saved.
                Join the group for your selected webinar below.
              </p>
              <Button variant="glow" size="lg" className="mt-6 w-full sm:w-auto" asChild>
                <a href={success.whatsappGroupUrl} target="_blank" rel="noopener noreferrer">
                  Join your webinar WhatsApp group
                </a>
              </Button>
              <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-muted-foreground">
                WhatsApp invitation links can be forwarded. They help you join the group, but are not a security or access-control mechanism.
              </p>
              <Button variant="ghost" className="mt-3" onClick={resetAfterSuccess}>
                Register for another webinar
              </Button>
            </section>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="glass-card p-5 sm:p-8">
              <div className="mb-7 flex items-start gap-3 rounded-lg border border-primary/15 bg-primary/5 p-4">
                <Video className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-medium">One form, four webinar topics</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fields marked <span className="text-destructive">*</span> are required.
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
                  <Input
                    id="fullName"
                    autoComplete="name"
                    className="mt-2"
                    disabled={isSubmitting}
                    value={form.fullName}
                    onChange={(event) => updateField("fullName", event.target.value)}
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? "fullName-error" : undefined}
                  />
                  <FieldError id="fullName-error" message={errors.fullName} />
                </div>

                <div>
                  <Label htmlFor="email">Email Address <span className="text-destructive">*</span></Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="mt-2"
                    disabled={isSubmitting}
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                  />
                  <FieldError id="email-error" message={errors.email} />
                </div>

                <div>
                  <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
                  <Input
                    id="mobile"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    className="mt-2"
                    disabled={isSubmitting}
                    value={form.mobile}
                    onChange={(event) => updateField("mobile", event.target.value)}
                    aria-invalid={Boolean(errors.mobile)}
                    aria-describedby={errors.mobile ? "mobile-error" : undefined}
                  />
                  <FieldError id="mobile-error" message={errors.mobile} />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="college-picker">
                    College <span className="text-destructive">*</span>
                  </Label>
                  <Popover open={collegePickerOpen} onOpenChange={setCollegePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="college-picker"
                        type="button"
                        variant="outline"
                        disabled={isSubmitting}
                        role="combobox"
                        aria-expanded={collegePickerOpen}
                        aria-invalid={Boolean(errors.collegeId)}
                        aria-describedby={errors.collegeId ? "collegeId-error" : "college-directory-note"}
                        className="mt-2 h-11 w-full justify-between font-normal"
                      >
                        <span className={selectedCollegeName ? "truncate text-foreground" : "text-muted-foreground"}>
                          {selectedCollegeName || "Search and select your college"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput placeholder="Search verified colleges..." />
                        <CommandList>
                          <CommandEmpty>No verified college matches. Choose the manual-entry option below.</CommandEmpty>
                          <CommandGroup heading="Verified college directory">
                            {collegeDirectory.colleges.map((college) => (
                              <CommandItem
                                key={college.id}
                                value={`${college.name} ${college.id}`}
                                onSelect={() => {
                                  updateField("collegeId", college.id);
                                  updateField("collegeName", "");
                                  setCollegePickerOpen(false);
                                }}
                              >
                                <Check className={`mr-2 h-4 w-4 ${form.collegeId === college.id ? "opacity-100" : "opacity-0"}`} />
                                {college.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <CommandItem
                              value="other college not listed manual entry"
                              onSelect={() => {
                                updateField("collegeId", OTHER_COLLEGE_ID);
                                updateField("collegeName", "");
                                setCollegePickerOpen(false);
                              }}
                            >
                              <Check className={`mr-2 h-4 w-4 ${form.collegeId === OTHER_COLLEGE_ID ? "opacity-100" : "opacity-0"}`} />
                              Other / College not listed
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <p id="college-directory-note" className="mt-2 text-xs leading-5 text-muted-foreground">
                    The verified official directory is not yet available as a downloadable dataset. You can enter your college manually.
                  </p>
                  <FieldError id="collegeId-error" message={errors.collegeId} />
                </div>

                {form.collegeId === OTHER_COLLEGE_ID && (
                  <div className="sm:col-span-2">
                    <Label htmlFor="collegeName">College Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="collegeName"
                      autoComplete="organization"
                      className="mt-2"
                      disabled={isSubmitting}
                      value={form.collegeName}
                      onChange={(event) => updateField("collegeName", event.target.value)}
                      aria-invalid={Boolean(errors.collegeName)}
                      aria-describedby={errors.collegeName ? "collegeName-error" : undefined}
                    />
                    <FieldError id="collegeName-error" message={errors.collegeName} />
                  </div>
                )}

                <div>
                  <Label htmlFor="department">Department <span className="text-destructive">*</span></Label>
                  <Input
                    id="department"
                    autoComplete="organization-title"
                    className="mt-2"
                    disabled={isSubmitting}
                    value={form.department}
                    onChange={(event) => updateField("department", event.target.value)}
                    aria-invalid={Boolean(errors.department)}
                    aria-describedby={errors.department ? "department-error" : undefined}
                  />
                  <FieldError id="department-error" message={errors.department} />
                </div>

                <div>
                  <Label htmlFor="yearOfStudy">Year of Study <span className="text-destructive">*</span></Label>
                  <select
                    id="yearOfStudy"
                    value={form.yearOfStudy}
                    disabled={isSubmitting}
                    onChange={(event) => updateField("yearOfStudy", event.target.value)}
                    aria-invalid={Boolean(errors.yearOfStudy)}
                    aria-describedby={errors.yearOfStudy ? "yearOfStudy-error" : undefined}
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose your year</option>
                    {years.map((year) => <option key={year} value={year}>{year}</option>)}
                  </select>
                  <FieldError id="yearOfStudy-error" message={errors.yearOfStudy} />
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="webinarId">Webinar Domain <span className="text-destructive">*</span></Label>
                  <select
                    id="webinarId"
                    value={form.webinarId}
                    disabled={isSubmitting}
                    onChange={(event) => updateField("webinarId", event.target.value)}
                    aria-invalid={Boolean(errors.webinarId)}
                    aria-describedby={errors.webinarId ? "webinarId-error" : undefined}
                    className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose a webinar</option>
                    {webinars.map((webinar) => (
                      <option key={webinar.id} value={webinar.id}>{webinar.name}</option>
                    ))}
                  </select>
                  <FieldError id="webinarId-error" message={errors.webinarId} />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="consent"
                    checked={form.consent}
                    disabled={isSubmitting}
                    onCheckedChange={(checked) => updateField("consent", checked === true)}
                    aria-invalid={Boolean(errors.consent)}
                    aria-describedby={errors.consent ? "consent-error" : undefined}
                    className="mt-0.5"
                  />
                  <Label htmlFor="consent" className="cursor-pointer text-sm font-normal leading-6 text-muted-foreground">
                    I agree to receive communications about this webinar, including joining details and relevant updates.
                    <span className="ml-1 text-destructive">*</span>
                  </Label>
                </div>
                <FieldError id="consent-error" message={errors.consent} />
              </div>

              {submitError && (
                <p className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              )}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Link to="/" className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Back to CodeRi8
                </Link>
                <Button type="submit" variant="glow" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? (
                    <><LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> Saving registration…</>
                  ) : (
                    "Register for webinar"
                  )}
                </Button>
              </div>
              <p className="mt-4 text-center text-xs leading-5 text-muted-foreground">
                Your information is used to manage this webinar registration and related communications.
              </p>
            </form>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default WebinarRegistration;
