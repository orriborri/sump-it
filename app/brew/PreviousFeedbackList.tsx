import { Box, Button, Typography, Rating } from "@mui/material";
import type { PreviousFeedback } from "./types";

interface Props {
  feedback: PreviousFeedback[];
  onUseAsFeedback: (feedback: PreviousFeedback) => void;
  selectedFeedbackId: number | null;
}

export const PreviousFeedbackList = ({
  feedback,
  onUseAsFeedback,
  selectedFeedbackId,
}: Props) => {
  if (feedback.length === 0) return null;

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Typography variant="subtitle1" gutterBottom>
        Previous Brews Feedback:
      </Typography>
      {feedback.map((feedbackItem, index) => (
        <Box
          key={index}
          sx={{
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            bgcolor:
              selectedFeedbackId === feedbackItem.id
                ? "action.selected"
                : "transparent",
            p: 1,
            borderRadius: 1,
          }}
        >
          <Box>
            <Typography variant="body2" color="text.secondary">
              Grind: {feedbackItem.grind}
              {feedbackItem.ratio && ` - Ratio: ${feedbackItem.ratio}`}
              {feedbackItem.too_strong && " - Too Strong"}
              {feedbackItem.too_weak && " - Too Weak"}
              {feedbackItem.is_sour &&
                " - Sour - You should increase the grind"}
              {feedbackItem.is_bitter &&
                " - Bitter - You should decrease the grind"}
            </Typography>
            {feedbackItem.overall_rating !== null && (
              <Rating
                value={feedbackItem.overall_rating}
                readOnly
                size="small"
              />
            )}
          </Box>
          <Button
            size="small"
            variant={
              selectedFeedbackId === feedbackItem.id ? "contained" : "outlined"
            }
            onClick={() => onUseAsFeedback(feedbackItem)}
          >
            {selectedFeedbackId === feedbackItem.id
              ? "Currently Using"
              : "Use as base"}
          </Button>
        </Box>
      ))}
    </Box>
  );
};
