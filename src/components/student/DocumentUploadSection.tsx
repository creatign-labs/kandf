import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, CheckCircle2, AlertCircle, FileText, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DocumentUploadSectionProps {
  passportPhotoUrl: string | null;
  addressProofUrl: string | null;
  marksheetUrl: string | null;
  documentsVerified: boolean;
  onUploadComplete: () => void;
}

export const DocumentUploadSection = ({
  passportPhotoUrl,
  addressProofUrl,
  marksheetUrl,
  documentsVerified,
  onUploadComplete,
}: DocumentUploadSectionProps) => {
  const [uploading, setUploading] = useState<string | null>(null);

  const documentTypes = [
    {
      key: "passport_photo",
      label: "Passport-size Photo",
      description: "Clear photo with white background",
      required: true,
      currentUrl: passportPhotoUrl,
      accept: "image/*",
    },
    {
      key: "address_proof",
      label: "Address Proof",
      description: "Aadhaar Card, Voter ID, or Utility Bill",
      required: true,
      currentUrl: addressProofUrl,
      accept: "image/*,.pdf",
    },
    {
      key: "marksheet",
      label: "Marksheet",
      description: "Latest educational qualification (optional)",
      required: false,
      currentUrl: marksheetUrl,
      accept: "image/*,.pdf",
    },
  ];

  const handleUpload = async (docKey: string, file: File) => {
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(docKey);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${docKey}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("student-documents")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("student-documents")
        .getPublicUrl(fileName);

      // Update profile
      const updateField = `${docKey}_url`;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ [updateField]: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({ title: "Document uploaded successfully" });
      onUploadComplete();
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const mandatoryComplete = passportPhotoUrl && addressProofUrl;

  return (
    <Card className="p-6 border-border/60">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Required Documents</h3>
        </div>
        {documentsVerified ? (
          <Badge className="bg-green-500 text-white gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Verified
          </Badge>
        ) : mandatoryComplete ? (
          <Badge variant="secondary">Pending Verification</Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Incomplete
          </Badge>
        )}
      </div>

      <div className="space-y-4">
        {documentTypes.map((doc) => (
          <div
            key={doc.key}
            className={`p-4 rounded-lg border ${
              doc.currentUrl
                ? "bg-green-50 border-green-200"
                : doc.required
                  ? "bg-amber-50 border-amber-200"
                  : "bg-muted/50 border-border"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="font-medium">{doc.label}</Label>
                  {doc.required && !doc.currentUrl && (
                    <Badge variant="destructive" className="text-xs">Required</Badge>
                  )}
                  {doc.currentUrl && (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{doc.description}</p>
              </div>
              
              <div className="flex items-center gap-2">
                {doc.currentUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.currentUrl!, "_blank")}
                  >
                    View
                  </Button>
                )}
                <Label htmlFor={doc.key} className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    {uploading === doc.key ? (
                      <Button size="sm" disabled>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Uploading...
                      </Button>
                    ) : (
                      <Button size="sm" variant={doc.currentUrl ? "outline" : "default"} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {doc.currentUrl ? "Replace" : "Upload"}
                        </span>
                      </Button>
                    )}
                  </div>
                  <Input
                    id={doc.key}
                    type="file"
                    accept={doc.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(doc.key, file);
                    }}
                    disabled={uploading !== null}
                  />
                </Label>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!mandatoryComplete && (
        <p className="text-sm text-muted-foreground mt-4 pt-4 border-t">
          Please upload all required documents to complete your enrollment.
        </p>
      )}
    </Card>
  );
};
