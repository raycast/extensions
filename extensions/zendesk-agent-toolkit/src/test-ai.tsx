import React, { useState } from "react";
import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { aiService } from "./ai-service";
import { ticketMonitor } from "./ticket-monitor";

export default function TestAI() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>("Click 'Test AI System' to verify everything is working.");

  async function testAISystem() {
    setTesting(true);
    let testResults = "# AI System Test Results\n\n";

    try {
      // Test 1: Check if AI service is enabled
      const isEnabled = aiService.isEnabled();
      testResults += `## ✅ AI Service Status\n**Enabled:** ${isEnabled ? "✅ YES" : "❌ NO"}\n\n`;

      if (!isEnabled) {
        testResults +=
          "**Issue:** AI service is not enabled. Check your OpenAI API key and enable AI macros in preferences.\n\n";
      }

      // Test 2: Check for recent tickets
      testResults += "## 🎫 Checking for Recent Tickets\n";
      const suggestions = await ticketMonitor.checkForResolvedTickets();
      testResults += `**Found:** ${suggestions.length} AI suggestions\n\n`;

      if (suggestions.length === 0) {
        testResults += "**Why no suggestions:**\n";
        testResults += "- No tickets resolved in last 24 hours\n";
        testResults += "- No patterns detected yet\n";
        testResults += "- Need to resolve 2-3 similar tickets first\n\n";
      } else {
        testResults += "**Available Suggestions:**\n";
        suggestions.forEach((suggestion, index) => {
          testResults += `${index + 1}. ${suggestion.title} (${Math.round(suggestion.confidence * 100)}% confidence)\n`;
        });
        testResults += "\n";
      }

      // Test 3: Simulate a ticket analysis
      testResults += "## 🤖 Testing AI Analysis\n";
      const mockTicket = {
        id: 12345,
        subject: "Password reset request",
        description: "User cannot access their account and needs password reset",
        status: "solved",
        priority: "normal",
        resolution_comment: "I've reset your password. Please check your email for the temporary password.",
        created_at: new Date().toISOString(),
        solved_at: new Date().toISOString(),
        assignee_actions: [
          { field: "status", from_value: "open", to_value: "solved", timestamp: new Date().toISOString() },
        ],
      };

      if (isEnabled) {
        testResults += "**Testing with mock ticket:** 'Password reset request'\n";
        const mockSuggestion = await aiService.analyzeTicketForMacro(mockTicket, []);

        if (mockSuggestion) {
          testResults += `**✅ AI Generated Suggestion:**\n`;
          testResults += `- **Title:** ${mockSuggestion.title}\n`;
          testResults += `- **Confidence:** ${Math.round(mockSuggestion.confidence * 100)}%\n`;
          testResults += `- **Actions:** ${mockSuggestion.actions.length} automation steps\n\n`;
        } else {
          testResults += "**ℹ️ AI decided this ticket doesn't need automation** (which is also correct behavior)\n\n";
        }
      } else {
        testResults += "**⏩ Skipped** - AI service not enabled\n\n";
      }

      testResults += "## 🎯 Next Steps\n\n";
      if (!isEnabled) {
        testResults += "1. **Configure OpenAI API Key** in extension preferences\n";
        testResults += "2. **Enable AI Macro Generation** checkbox\n";
        testResults += "3. **Resolve a few tickets** in Zendesk to create patterns\n";
      } else if (suggestions.length === 0) {
        testResults += "1. **Resolve 2-3 similar tickets** in Zendesk (password resets, account issues, etc.)\n";
        testResults += "2. **Check Dashboard** - it will show AI suggestions when available\n";
        testResults += "3. **Patterns emerge** after resolving similar ticket types\n";
      } else {
        testResults +=
          "**🎉 Everything is working!** Check the 'AI Macro Suggestions' command to see your suggestions.\n";
      }

      await showToast({
        style: Toast.Style.Success,
        title: "AI System Test Complete",
        message: isEnabled ? "System is configured correctly" : "Configuration needed",
      });
    } catch (error) {
      testResults += `## ❌ Error During Testing\n\n**Error:** ${String(error)}\n\n`;
      testResults += "**Possible Issues:**\n";
      testResults += "- Invalid OpenAI API key\n";
      testResults += "- Network connectivity issues\n";
      testResults += "- Zendesk API authentication problems\n";

      await showToast({
        style: Toast.Style.Failure,
        title: "AI Test Failed",
        message: String(error),
      });
    } finally {
      setTesting(false);
      setResult(testResults);
    }
  }

  return (
    <Detail
      isLoading={testing}
      markdown={result}
      actions={
        <ActionPanel>
          <Action title="Test AI System" icon="🧪" onAction={testAISystem} />
        </ActionPanel>
      }
    />
  );
}
