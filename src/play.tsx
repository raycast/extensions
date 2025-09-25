import { runPlayCommand, PlayCommandProps } from "./commands/play";

export default function Command(props: PlayCommandProps) {
  runPlayCommand(props);
}
