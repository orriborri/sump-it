import { Box, Button, Typography, Rating } from "@mui/material";
import type { PreviousFeedback } from "./types";

interface Props {
  feedback: PreviousFeedback[];
  onUseAsFeedback: (feedback: PreviousFeedback) => void;
}

export const PreviousFeedbackList = ({ feedback, onUseAsFeedback }: Props) => {
  if (feedback.length === 0) return null;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Previous Brews Feedback:
      </Typography>
      {feedback.map((feedback, index) => (
        <Box
          key={index}
          sx={{
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Grind: {feedback.grind}
              {feedback.ratio && ` - Ratio: ${feedback.ratio}`}
              {feedback.too_strong && " - Too Strong"}
              {feedback.too_weak && " - Too Weak"}
              {feedback.is_sour && " - Sour - You should increase the grind"}
              {feedback.is_bitter &&
                " - Bitter - You should decrease the grind"}
            </Typography>
            {feedback.overall_rating !== null && (
              <Rating value={feedback.overall_rating} readOnly size="small" />
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={() => onUseAsFeedback(feedback)}
          >
            Use as base
          </Button>
        </Box>
      ))}
    </Box>
  );
};
