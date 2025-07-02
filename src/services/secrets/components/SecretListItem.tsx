import { List, Icon, Color } from "@raycast/api";
import { Secret, SecretManagerService } from "../SecretManagerService";

interface SecretListItemProps {
  secret: Secret;
}

export default function SecretListItem({ secret }: SecretListItemProps) {
  const secretId = SecretManagerService.extractSecretId(secret.name);

  const getSecretIcon = (): { source: Icon; tintColor?: Color } => {
    if (secret.expireTime) {
      const expireDate = new Date(secret.expireTime);
      const now = new Date();
      if (expireDate < now) {
        return { source: Icon.Clock, tintColor: Color.Red };
      } else if (expireDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
        return { source: Icon.Clock, tintColor: Color.Orange };
      }
    }
    return { source: Icon.Lock, tintColor: Color.Green };
  };

  const getSecretSubtitle = (): string => {
    const parts: string[] = [];

    // Add creation time
    parts.push(`Created ${SecretManagerService.formatRelativeTime(secret.createTime)}`);

    // Add expiration if exists
    if (secret.expireTime) {
      const expireDate = new Date(secret.expireTime);
      const now = new Date();
      if (expireDate < now) {
        parts.push("Expired");
      } else {
        parts.push(`Expires ${SecretManagerService.formatRelativeTime(secret.expireTime)}`);
      }
    }

    return parts.join(" • ");
  };

  const getSecretAccessories = (): List.Item.Accessory[] => {
    const accessories: List.Item.Accessory[] = [];

    // Show labels if any
    if (secret.labels && Object.keys(secret.labels).length > 0) {
      accessories.push({
        icon: Icon.Tag,
        tooltip: `Labels: ${Object.entries(secret.labels)
          .map(([key, value]) => `${key}=${value}`)
          .join(", ")}`,
      });
    }

    // Show rotation if configured
    if (secret.rotation) {
      accessories.push({
        icon: Icon.ArrowClockwise,
        tooltip: "Automatic rotation enabled",
      });
    }

    return accessories;
  };

  return (
    <List.Item
      key={secret.name}
      id={secret.name}
      title={secretId}
      subtitle={getSecretSubtitle()}
      icon={getSecretIcon()}
      accessories={getSecretAccessories()}
    />
  );
}
