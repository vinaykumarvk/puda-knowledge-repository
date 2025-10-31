import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface VoiceInputButtonProps {
  onTranscriptionComplete: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscriptionComplete, disabled }: VoiceInputButtonProps) {
  console.log("🎤 VoiceInputButton rendering...");
  
  return (
    <Button
      data-testid="button-voice-input"
      size="lg"
      variant="outline"
      className="h-[60px] w-[60px] p-0"
      disabled={disabled}
      onClick={() => alert("Voice button clicked! Full implementation will be added shortly.")}
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
}
