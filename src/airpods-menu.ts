import { runAppleScript, showFailureToast } from "@raycast/utils";
import { Prefs } from "./type";
import { updateCommandMetadata } from "@raycast/api";
import { isSequoiaOrLater } from "./utils";

export async function execAirPodsMenu(
  { airpodsIndex, airpodsType, soundLoc, optionOne, optionTwo }: Prefs,
  toggleOption = "",
): Promise<string | null> {
  const useControlCenter = isSequoiaOrLater();
  const isAirPodsMax = airpodsType === "max";

  // Script for macOS Sequoia and later (uses ControlCenter process)
  const controlCenterScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}
set OptionOne to "${optionOne}"
set OptionTwo to "${optionTwo}"

tell application "System Events"
	tell application process "ControlCenter"
		try
			set output to "🔴 No Change"

			-- STEP 1: Open Control Center
			set ccMenu to missing value
			set menuBarItems to menu bar items of menu bar 1

			repeat with menuItem in menuBarItems
				try
					set menuDesc to description of menuItem
					if menuDesc is "Control Center" then
						set ccMenu to menuItem
						exit repeat
					end if
				end try
			end repeat

			if ccMenu is missing value then
				return "error-control-center-not-found"
			end if

			-- Strategy: Ensure Control Center is open with retry logic
			set win to missing value
			set maxAttempts to 3

			repeat with attempt from 1 to maxAttempts
				-- First, try to get existing window
				try
					set win to window 1
					if win is not missing value then exit repeat
				end try

				-- If no window, close any stale state and open fresh
				try
					key code 53 -- ESC to ensure closed state
				end try
				delay 0.1

				-- Click to open
				click ccMenu
				delay 0.8

				-- Check if it opened
				try
					set win to window 1
					if win is not missing value then exit repeat
				end try
			end repeat

			if win is missing value then
				return "error-control-center-window-not-found"
			end if

			-- STEP 2: Find Sound Module (group containing slider with "volume")
			set topGroup to UI element 1 of win
			set topChildren to UI elements of topGroup

			set soundModule to missing value
			repeat with child in topChildren
				try
					if role of child is "AXGroup" then
						set groupChildren to UI elements of child
						repeat with grandchild in groupChildren
							try
								if role of grandchild is "AXSlider" then
									set sliderDesc to description of grandchild
									if sliderDesc contains "volume" or sliderDesc contains "sound" then
										set soundModule to child
										exit repeat
									end if
								end if
							end try
						end repeat
					end if
				end try
				if soundModule is not missing value then exit repeat
			end repeat

			if soundModule is missing value then
				key code 53 -- ESC
				return "error-sound-module-not-found"
			end if

			-- STEP 3: Click Sound Module to expand
			click soundModule
			delay 0.5

			-- STEP 4: Find Scroll Area (with retry)
			set scrollArea to missing value
			repeat 5 times
				try
					set win to window 1
					set winElements to UI elements of win

					-- Check Level 1
					repeat with elem in winElements
						if role of elem is "AXScrollArea" then
							set scrollArea to elem
							exit repeat
						end if
					end repeat

					if scrollArea is not missing value then exit repeat

					-- Check Level 2 (inside groups)
					repeat with elem in winElements
						if role of elem is "AXGroup" then
							try
								set groupElems to UI elements of elem
								repeat with subElem in groupElems
									if role of subElem is "AXScrollArea" then
										set scrollArea to subElem
										exit repeat
									end if
								end repeat
							end try
						end if
						if scrollArea is not missing value then exit repeat
					end repeat

					if scrollArea is not missing value then exit repeat
				end try
				delay 0.3
			end repeat

			if scrollArea is missing value then
				key code 53 -- ESC
				return "error-scroll-area-not-found"
			end if

			-- STEP 5: Get all checkboxes BEFORE expansion
			set allCheckboxes to checkboxes of scrollArea
			set cbCount to count of allCheckboxes

			if AirPodsIndex > cbCount then
				key code 53 -- ESC
				return "error-airpods-index-too-high"
			end if

			set airpodsCheckbox to item AirPodsIndex of allCheckboxes
			set airpodsConnected to value of airpodsCheckbox as boolean

			if airpodsConnected is false then
				key code 53 -- ESC
				return "airpods-not-connected"
			end if

			-- STEP 6: Find and expand disclosure triangle for AirPods
			set allElements to UI elements of scrollArea
			set checkboxIndex to -1

			-- Find index of our checkbox in all elements
			repeat with i from 1 to count of allElements
				try
					if item i of allElements is equal to airpodsCheckbox then
						set checkboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			-- Look for disclosure triangle after the checkbox
			if checkboxIndex > 0 then
				repeat with j from (checkboxIndex + 1) to (checkboxIndex + 5)
					if j > (count of allElements) then exit repeat
					try
						set elem to item j of allElements
						if role of elem is "AXDisclosureTriangle" then
							set triangleExpanded to value of elem as boolean
							if triangleExpanded is false then
								click elem
								delay 0.2
							end if
							exit repeat
						end if
					end try
				end repeat
			end if

			-- STEP 7: Re-fetch checkboxes AFTER expansion
			delay 0.1
			set allCheckboxes to checkboxes of scrollArea

			-- Re-find our AirPods checkbox index
			set deviceCheckboxIndex to -1
			repeat with i from 1 to count of allCheckboxes
				try
					if item i of allCheckboxes is equal to airpodsCheckbox then
						set deviceCheckboxIndex to i
						exit repeat
					end if
				end try
			end repeat

			if deviceCheckboxIndex is -1 then
				key code 53 -- ESC
				return "error-airpods-checkbox-lost"
			end if

			-- STEP 8: Get checkboxes after the device (these are the modes)
			set modeCandidates to {}
			set maxCandidates to 10 -- Get up to 10 checkboxes after device
			repeat with k from (deviceCheckboxIndex + 1) to (deviceCheckboxIndex + maxCandidates)
				if k <= (count of allCheckboxes) then
					set end of modeCandidates to item k of allCheckboxes
				end if
			end repeat

			set candidateCount to count of modeCandidates

			if candidateCount < 3 then
				key code 53 -- ESC
				return "error-insufficient-mode-checkboxes"
			end if

			-- STEP 9: Determine layout (3-mode for Max, 4-mode for Pro)
			set layoutType to "3-mode" -- Default for Max

			if isAirPodsMax is false then
				set layoutType to "4-mode" -- Pro has Off, Transparency, Adaptive, NC
			end if

			-- Override detection: if we have 6+ candidates, likely 4-mode + CA
			if candidateCount >= 6 then
				set layoutType to "4-mode"
			end if

			-- STEP 10: Toggle between modes
			if ToggleOption is "noise-control" then
				-- Detect current active mode
				set activeIndex to -1
				repeat with m from 1 to candidateCount
					try
						if value of (item m of modeCandidates) as boolean is true then
							set activeIndex to m
							exit repeat
						end if
					end try
				end repeat

				-- Map option names to indices
				set idxOne to 1
				set idxTwo to 1

				if layoutType is "4-mode" then
					-- 1:Off, 2:Transparency, 3:Adaptive, 4:NC
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Adaptive" then set idxOne to 3
					if OptionOne is "Noise Cancellation" then set idxOne to 4

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Adaptive" then set idxTwo to 3
					if OptionTwo is "Noise Cancellation" then set idxTwo to 4
				else
					-- 3-mode: 1:Off, 2:Transparency, 3:NC
					if OptionOne is "Off" then set idxOne to 1
					if OptionOne is "Transparency" then set idxOne to 2
					if OptionOne is "Noise Cancellation" then set idxOne to 3

					if OptionTwo is "Off" then set idxTwo to 1
					if OptionTwo is "Transparency" then set idxTwo to 2
					if OptionTwo is "Noise Cancellation" then set idxTwo to 3
				end if

				-- Toggle logic
				if activeIndex is equal to idxOne then
					if idxTwo <= candidateCount then
						click item idxTwo of modeCandidates
						set output to "🟢 " & OptionTwo
					end if
				else
					if idxOne <= candidateCount then
						click item idxOne of modeCandidates
						set output to "🔵 " & OptionOne
					end if
				end if
			else
				-- Conversation Awareness Toggle
				set caOffset to 4 -- After Off, Trans, NC (for 3-mode)
				if layoutType is "4-mode" then
					set caOffset to 5 -- After Off, Trans, Adaptive, NC
				end if

				if candidateCount >= (caOffset + 1) then
					set caOffCheckbox to item caOffset of modeCandidates
					set caOnCheckbox to item (caOffset + 1) of modeCandidates

					set caOffSelected to value of caOffCheckbox as boolean
					if caOffSelected is true then
						click caOnCheckbox
						set output to "🟢 On"
					else
						click caOffCheckbox
						set output to "🔵 Off"
					end if
				else
					key code 53 -- ESC
					return "conversation-awareness-not-supported"
				end if
			end if

			-- Close and return
			key code 53 -- ESC
			return output

		on error errMsg
			try
				key code 53 -- ESC
			end try
			return "error: " & errMsg
		end try
	end tell
end tell
  `;
  // Legacy script for pre-Sequoia macOS (uses SystemUIServer)
  const legacyScript = `
set AirPodsIndex to ${airpodsIndex}
set ToggleOption to "${toggleOption}"
set isAirPodsMax to ${isAirPodsMax}

-- Get option index for AirPods Max (has Off, Transparency, Noise Cancellation)
on getMaxOptionIndex(Opt)
	if Opt is equal to "Off" then
		return 1
	else if Opt is equal to "Transparency" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getMaxOptionIndex

-- Get option index for AirPods Pro (has Transparency, Adaptive, Noise Cancellation)
on getProOptionIndex(Opt)
	if Opt is equal to "Transparency" then
		return 1
	else if Opt is equal to "Adaptive" then
		return 2
	else if Opt is equal to "Noise Cancellation" then
		return 3
	else
		return 1
	end if
end getProOptionIndex

-- Calculate indices based on user preferences and AirPods type
if ToggleOption is "noise-control"
	set OptionOne to "${optionOne}"
	set OptionTwo to "${optionTwo}"

	if isAirPodsMax then
		-- Validate that Adaptive is not selected for AirPods Max
		if OptionOne is equal to "Adaptive" or OptionTwo is equal to "Adaptive" then
			return "adaptive-not-supported-on-max"
		end if
		set IndexOne to AirPodsIndex + getMaxOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getMaxOptionIndex(OptionTwo)
	else
		set IndexOne to AirPodsIndex + getProOptionIndex(OptionOne)
		set IndexTwo to AirPodsIndex + getProOptionIndex(OptionTwo)
	end if
else
	-- Conversation Awareness (Pro only)
	if isAirPodsMax then
		return "conversation-awareness-not-supported"
	end if
	set OptionOne to "Off"
	set OptionTwo to "On"
	-- CA Off at +4, CA On at +5 (after the 3 listening mode options)
	set IndexOne to AirPodsIndex + 4
	set IndexTwo to AirPodsIndex + 5
end if

tell application "System Events"
	tell application process "SystemUIServer"
		try
			set output to "🔴 No Change"
			set menuBar to (first menu bar item whose description is "${soundLoc}") of menu bar 1
			tell menuBar to click
			delay 0.1
			set soundMenu to menu 1 of menuBar
			set menuElements to entire contents of soundMenu
			set btCheckbox to (checkbox AirPodsIndex of soundMenu)
			set btCheckboxValue to value of btCheckbox as boolean

			if btCheckboxValue is true then
				repeat with i from 1 to length of menuElements
					set currentItem to item i of menuElements
					if currentItem is equal to btCheckbox then
						set givenIndex to i
						exit repeat
					end if
				end repeat

				set expandToggle to item (i - 1) of menuElements
				set expandToggleExpanded to value of expandToggle as boolean
				if expandToggleExpanded is false then
					click expandToggle
					delay 0.1
				end if

				set currentMode to value of checkbox IndexOne of soundMenu as boolean
				if currentMode is true then
					click checkbox IndexTwo of soundMenu
					set output to "🟢 " & OptionTwo
				else
					click checkbox IndexOne of soundMenu
					set output to "🔵 " & OptionOne
				end if
			else
				tell menuBar to click
				return "airpods-not-connected"
			end if

			tell menuBar to click
			return output
		on error errMsg
			try
				tell menuBar to click
			end try
			return "sound-menu-not-found"
		end try
	end tell
end tell
  `;

  const script = useControlCenter ? controlCenterScript : legacyScript;

  try {
    const result = await runAppleScript<string>(script);

    switch (result) {
      case "sound-menu-not-found": {
        await showFailureToast("", {
          title: "Sound menu not found. Check Localization!",
        });
        return null;
      }
      case "error-control-center-not-found": {
        await showFailureToast("", {
          title: "Control Center not found in menu bar",
        });
        return null;
      }
      case "error-control-center-window-not-found": {
        await showFailureToast("", {
          title: "Control Center window did not open",
        });
        return null;
      }
      case "error-sound-module-not-found": {
        await showFailureToast("", {
          title: "Sound module not found in Control Center",
        });
        return null;
      }
      case "error-scroll-area-not-found": {
        await showFailureToast("", {
          title: "Could not open sound device list",
        });
        return null;
      }
      case "error-airpods-index-too-high": {
        await showFailureToast("", {
          title: "AirPods index too high. Check your settings.",
        });
        return null;
      }
      case "airpods-not-connected": {
        await showFailureToast("", { title: "AirPods not connected!" });
        return null;
      }
      case "error-airpods-checkbox-lost": {
        await showFailureToast("", {
          title: "Lost track of AirPods after expansion",
        });
        return null;
      }
      case "error-insufficient-mode-checkboxes": {
        await showFailureToast("", {
          title: "Could not find noise control modes",
        });
        return null;
      }
      case "conversation-awareness-not-supported": {
        await showFailureToast("", {
          title: "Conversation Awareness not supported on AirPods Max",
        });
        return null;
      }
      case "adaptive-not-supported-on-max": {
        await showFailureToast("", {
          title: "Adaptive mode not available on AirPods Max",
        });
        return null;
      }
      default: {
        // Handle generic errors that start with "error:"
        if (result.startsWith("error:")) {
          await showFailureToast("", {
            title: result.replace("error:", "").trim(),
          });
          return null;
        }

        // Success - update metadata with result
        await updateCommandMetadata({ subtitle: `Mode: ${result}` });
        return result;
      }
    }
  } catch (error) {
    await showFailureToast(error, { title: "Could not run AppleScript" });

    return null;
  }
}
