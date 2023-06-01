import {Action, ActionPanel, Clipboard, List} from "@raycast/api";
import {useEffect, useState} from "react";
import {addDays, addMonths, addWeeks, addYears, endOfDay, format, fromUnixTime, getUnixTime, startOfDay, startOfMonth, startOfWeek, startOfYear,} from "date-fns";

interface Timestamp {
	label: string,
	value: Date
}

interface TimestampCollection {
	[key: string]: Timestamp[]
}

function verbose(timestamp: number) {
	return format(fromUnixTime(timestamp), "yyyy-MM-dd h:mm:ssaaa O");
}

function defaultSections(): TimestampCollection {
	const now = new Date();
	return {
		'Today': [
			{label: "Now", value: now},
			{label: "Start of Today", value: startOfDay(now)},
			{label: "End of Today", value: endOfDay(now)},
		],
		'Past': [
			{label: "Yesterday", value: addDays(now, -1)},
			{label: "Start of Week", value: startOfWeek(now)},
			{label: "Start of Month", value: startOfMonth(now)},
			{label: "Start of Year", value: startOfYear(now)},
		],
		'Future': [
			{label: "Tomorrow", value: addDays(now, 1)},
			{label: "Next Week", value: addWeeks(now, 1)},
			{label: "Next Month", value: addMonths(now, 1)},
			{label: "Next Year", value: addYears(now, 1)},
		],
	};
}

export default function PhpTimestampHelper() {
	const [sections, setSections] = useState(defaultSections);
	
	useEffect(() => {
		Clipboard.readText().then((text) => {
			if (text && text.match(/^\s*\d{10}\s*$/)) {
				setSections({
					'Clipboard': [{label: "Clipboard", value: fromUnixTime(parseInt(text.trim()))}],
					...sections,
				});
			}
		});
	}, []);
	
	return (
		<List>
			{Object.entries(sections).map(([label, timestamps]) => {
				return <Section key={label} label={label} timestamps={timestamps} />;
			})}
		</List>
	);
}

function Section(props: { label: string, timestamps: Timestamp[] }) {
	const {label, timestamps} = props;
	
	if (!timestamps.length) {
		return null;
	}
	
	return (
		<List.Section title={label}>
			{timestamps.map(({label, value}) => <Row key={label} label={label} value={value} />)}
		</List.Section>
	);
}

function Row(props: { label: string, value: Date }) {
	const {label, value} = props;
	
	return (
		<List.Item
			title={`${getUnixTime(value)}`}
			subtitle={label}
			accessories={[
				{text: format(value, "yyyy-MM-dd  h:mm:ssaaa  O")},
			]}
			actions={
				<ActionPanel>
					<Action.CopyToClipboard content={`${getUnixTime(value)}`} />
				</ActionPanel>
			}
		/>
	);
}
