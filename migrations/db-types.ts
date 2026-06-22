// Simple DB interface for migrations
export interface DB {
  beans: Record<string, unknown>;
  methods: Record<string, unknown>;
  grinders: Record<string, unknown>;
  brews: Record<string, unknown>;
  brew_feedback: Record<string, unknown>;
}
