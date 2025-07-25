import * as React from "react"
import { Clipboard, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface InputWithPasteProps extends React.ComponentProps<"input"> {
  onPasteText?: (value: string) => void;
}

const InputWithPaste = React.forwardRef<HTMLInputElement, InputWithPasteProps>(
  ({ className, onPasteText, ...props }, ref) => {
    const [isPasting, setIsPasting] = React.useState(false);
    const { toast } = useToast();

    const handlePaste = async () => {
      try {
        setIsPasting(true);
        const text = await navigator.clipboard.readText();
        
        if (text) {
          // Create a synthetic event for onChange
          const syntheticEvent = {
            target: { value: text },
            currentTarget: { value: text }
          } as React.ChangeEvent<HTMLInputElement>;
          
          // Call the onChange handler if it exists
          if (props.onChange) {
            props.onChange(syntheticEvent);
          }
          
          // Call the custom onPasteText handler if it exists
          if (onPasteText) {
            onPasteText(text);
          }

          toast({
            title: "Pasted successfully",
            description: "Address pasted from clipboard",
          });
        }
      } catch (error) {
        console.error('Failed to paste from clipboard:', error);
        toast({
          title: "Paste failed",
          description: "Unable to access clipboard. Please paste manually.",
          variant: "destructive",
        });
      } finally {
        setTimeout(() => setIsPasting(false), 1000);
      }
    };

    return (
      <div className="relative">
        <input
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-12 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className
          )}
          ref={ref}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          onClick={handlePaste}
          disabled={isPasting}
        >
          {isPasting ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Clipboard className="h-4 w-4" />
          )}
        </Button>
      </div>
    )
  }
)
InputWithPaste.displayName = "InputWithPaste"

export { InputWithPaste }