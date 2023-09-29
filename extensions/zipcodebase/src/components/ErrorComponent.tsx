import { Detail } from "@raycast/api";

export default function ErrorComponent({error}: {error: string}) {
    return (
        <Detail markdown={`#Error

${error}`} />
    )
}