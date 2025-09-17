# Zendesk Agent Toolkit

A comprehensive Raycast extension for Zendesk support agents to manage tickets, create help articles, and monitor performance directly from their desktop.

## Features

### 🎫 **Ticket Management**
- View and manage assigned tickets
- Reply to tickets with rich text and image uploads
- Update ticket status, priority, and assignment
- Apply macros for common actions
- Convert resolved tickets to help articles

### 📊 **Performance Dashboard**
- 8-week ticket analytics with visual graphs
- Daily performance metrics
- AI-powered macro suggestions
- Team performance insights

### 🔍 **Help Center Integration**
- Search and browse help articles
- Create new articles from Markdown
- Promote and archive articles
- AI-powered article generation from tickets

### ⚡ **Macro Management**
- Apply existing macros to tickets
- Create custom macros on-the-fly
- AI-powered macro suggestions
- Custom field integration

### 🤖 **AI Features**
- **AI Article Creation**: Automatically generate professional help articles from resolved tickets
- **Smart Content Generation**: Uses GPT-4 to create Problem/Solution formatted articles
- **Image Support**: Handles inline images from tickets in generated articles
- **AI Macro Suggestions**: Get intelligent macro recommendations based on ticket patterns
- **Natural Language Processing**: Advanced content analysis and generation

## Commands

### **Core Management**
- **Dashboard** - View ticket analytics and performance metrics
- **Tickets** - Manage and respond to Zendesk tickets
- **Help Center** - Search and manage help articles

### **Automation & AI**
- **Macros** - Apply and create ticket macros
- **AI Suggestions** - View AI-generated macro suggestions
- **Convert to Article** - **🤖 AI-powered article creation from resolved tickets**
- **Test AI** - Debug and test AI functionality

### **Quick Actions**
- **Zendesk Placeholders** - Reference guide for Zendesk template variables

## Requirements

### **Essential**
- Zendesk account with API access
- API token with appropriate permissions

### **For AI Features (Recommended)**
- OpenAI API key (GPT-4 recommended for best results)
- Valid OpenAI account with available credits

### **System Requirements**
- macOS 11.0 or later
- Raycast app installed

## Setup

1. **Install the extension** from the Raycast Store
2. **Configure Zendesk preferences**:
   - Subdomain (e.g., `yourcompany` for `yourcompany.zendesk.com`)
   - Email address
   - API Token (generate in Zendesk Admin → Channels → API)
3. **Enable AI Features** (Optional but recommended):
   - Get an OpenAI API key from [OpenAI Platform](https://platform.openai.com/api-keys)
   - Add the key in Raycast → Extensions → Zendesk Agent Toolkit → Preferences
   - Enable "Enable AI Macros" checkbox
4. **Customize your setup**:
   - Set custom field IDs for System and Issue fields
   - Configure available agent groups

## Preferences

### **Zendesk Configuration**
- **Subdomain**: Your Zendesk subdomain (e.g., `yourcompany`)
- **Email**: Your Zendesk agent email address
- **API Token**: Zendesk API token with appropriate permissions

### **Custom Fields**
- **System Field ID**: Custom field ID for system categorization
- **Issue Field ID**: Custom field ID for issue type classification
- **Groups**: Available agent groups for ticket assignment

### **AI Configuration**
- **OpenAI API Key**: Your GPT-4 API key for AI features
- **Enable AI Macros**: Toggle AI-powered macro suggestions
- **AI Article Generation**: Automatically enabled with valid API key

## 🤖 AI Article Creation

One of the most powerful features of this extension is the ability to automatically generate professional help articles from resolved tickets using GPT-4.

### **How It Works**
1. **Select a resolved ticket** from your ticket list
2. **Use "Convert to Article" action** to open the AI generation form
3. **AI analyzes the ticket conversation** and creates a structured article
4. **Review and edit** the generated content as needed
5. **Publish directly to Zendesk Help Center**

### **AI-Generated Content Features**
- **Problem/Solution Format**: Automatically structures content with clear headers
- **Generic Language**: Removes user-specific references for professional articles
- **Image Support**: Preserves and includes inline images from tickets
- **Markdown to HTML**: Converts AI output to Zendesk-compatible HTML
- **Smart Categorization**: Suggests appropriate Help Center sections

### **Best Practices**
- Use for tickets with clear problem resolution patterns
- Review and edit AI-generated content before publishing
- Ensure the ticket contains enough detail for good article generation
- Consider using this for common support scenarios and FAQs

## Privacy

This extension:
- Connects directly to your Zendesk instance
- Stores credentials locally on your device
- Does not send data to third-party services (except OpenAI when using AI features)
- Respects Zendesk's data privacy policies

## 🔧 Troubleshooting

### **Common Setup Issues**
- **"Cannot connect to Zendesk"**: Verify your subdomain, email, and API token
- **"API key not found"**: Check that your OpenAI API key is entered correctly
- **"Permission denied"**: Ensure your Zendesk API token has appropriate permissions
- **"No tickets found"**: Verify you're in the correct group or assignment view

### **AI Feature Issues**
- **"OpenAI API key not configured"**: Add your API key in Raycast preferences
- **"Article generation failed"**: Check your OpenAI account has available credits
- **"Poor article quality"**: Ensure the source ticket has detailed conversation history

### **Getting Help**
- Check the [Zendesk API documentation](https://developer.zendesk.com/api-reference/)
- Review [OpenAI API documentation](https://platform.openai.com/docs)
- Visit our [GitHub repository](https://github.com/Unicornninja80/raycast-zendesk) for issues and feature requests

## Support

For issues or feature requests, please visit the [GitHub repository](https://github.com/Unicornninja80/raycast-zendesk).

## License

MIT License - see LICENSE file for details.
