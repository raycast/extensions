import { Color, Icon, type Image } from "@raycast/api";

type StatusStyle = {
  icon: Icon;
  color: Color;
};

const STATUS_STYLES: Record<string, StatusStyle> = {
  passed: { icon: Icon.CheckCircle, color: Color.Green },
  success: { icon: Icon.CheckCircle, color: Color.Green },
  running: { icon: Icon.CircleProgress50, color: Color.Blue },
  creating: { icon: Icon.CircleProgress50, color: Color.Blue },
  updating: { icon: Icon.CircleProgress50, color: Color.Blue },
  created: { icon: Icon.Clock, color: Color.Yellow },
  waiting: { icon: Icon.Clock, color: Color.Yellow },
  timeout: { icon: Icon.Stopwatch, color: Color.Orange },
  unstable: { icon: Icon.Warning, color: Color.Orange },
  failed: { icon: Icon.XMarkCircle, color: Color.Red },
  deleting: { icon: Icon.Trash, color: Color.Red },
  sleeping: { icon: Icon.Moon, color: Color.Purple },
  cancelled: { icon: Icon.MinusCircle, color: Color.SecondaryText },
  reject: { icon: Icon.MinusCircle, color: Color.SecondaryText },
};

const UNKNOWN_STATUS_STYLE: StatusStyle = { icon: Icon.Circle, color: Color.SecondaryText };

const getStatusStyle = (status: string) => STATUS_STYLES[status] ?? UNKNOWN_STATUS_STYLE;

export const getStatusColor = (status: string) => getStatusStyle(status).color;

export function getStatusIcon(status: string): Image.ImageLike {
  const { icon, color } = getStatusStyle(status);

  return { source: icon, tintColor: color };
}
