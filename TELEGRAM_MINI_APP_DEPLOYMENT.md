# Telegram Mini App Deployment Guide

This guide explains how to deploy your Arkade Wallet as a Telegram Mini App.

## Prerequisites

1. **Telegram Bot**: You need to create a Telegram bot using [@BotFather](https://t.me/BotFather)
2. **HTTPS Hosting**: Telegram Mini Apps require HTTPS hosting
3. **Domain**: A publicly accessible domain name

## Step 1: Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/BotFather)
2. Start a conversation and send `/newbot`
3. Follow the instructions to create your bot:
   - Choose a name for your bot (e.g., "Arkade Wallet")
   - Choose a username (e.g., "arkade_wallet_bot")
4. Save the **bot token** that BotFather provides

## Step 2: Configure Mini App with BotFather

1. Send `/mybots` to BotFather
2. Select your bot
3. Choose **Bot Settings** → **Menu Button** → **Configure Menu Button**
4. Set the menu button URL to your hosted Mini App URL
5. Choose **Bot Settings** → **Configure Mini App**
6. Enable Mini App and set the URL to your hosted application

### Alternative: Use Web App Button

Instead of the menu button, you can create a custom keyboard with a Web App button:

```javascript
// Example bot setup (Node.js with telegraf)
const { Telegraf } = require('telegraf')

const bot = new Telegraf('YOUR_BOT_TOKEN')

bot.start((ctx) => {
  ctx.reply('Welcome to Arkade Wallet!', {
    reply_markup: {
      keyboard: [[{
        text: '💰 Open Wallet',
        web_app: { url: 'https://your-domain.com' }
      }]],
      resize_keyboard: true
    }
  })
})

bot.launch()
```

## Step 3: Build and Deploy Your App

### Build the Application

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build
```

### Deployment Options

#### Option 1: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Deploy:
   ```bash
   vercel --prod
   ```

3. Configure custom domain in Vercel dashboard

#### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm i -g netlify-cli
   ```

2. Build and deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

#### Option 3: GitHub Pages with Custom Domain

1. Add a `CNAME` file to your `public` folder with your domain
2. Configure GitHub Pages to use your custom domain
3. Enable HTTPS in GitHub Pages settings

#### Option 4: Self-hosted

Ensure your server:
- Serves files over HTTPS
- Has proper SSL certificate
- Serves the `dist` folder contents
- Has proper CORS headers if needed

## Step 4: Configure Environment Variables

Create a `.env.production` file:

```env
VITE_TELEGRAM_BOT_NAME=your_bot_username
VITE_APP_URL=https://your-domain.com
VITE_SENTRY_DSN=your_sentry_dsn_if_using
```

## Step 5: Test Your Mini App

### Development Testing

For development, you can use the Telegram test environment:

1. Switch to test environment:
   - **iOS**: Tap Settings icon 10 times → Accounts → Login to another account → Test
   - **Desktop**: Settings → Shift + Alt + Right click 'Add Account' → Test Server
   - **macOS**: Click Settings icon 10 times → ⌘ + click 'Add Account'

2. Create a test bot with [@BotFather](https://t.me/BotFather) in test environment

3. For testing, you can use HTTP URLs (only in test environment)

### Production Testing

1. Test the Mini App URL directly in browser
2. Test through your Telegram bot
3. Verify all Telegram features work correctly

## Step 6: Mini App Features Integration

Your app now includes these Telegram Mini App features:

### Basic Integration
- ✅ Telegram theme integration
- ✅ User data access
- ✅ Haptic feedback
- ✅ Main button control
- ✅ Back button control

### Available Features
- **Theme Integration**: App automatically adapts to user's Telegram theme
- **User Information**: Access to user's Telegram profile data
- **Haptic Feedback**: Provide tactile feedback for actions
- **Native Buttons**: Use Telegram's native main and back buttons
- **Alerts & Confirmations**: Native Telegram dialogs

### Advanced Features (Can be implemented)
- **Cloud Storage**: Store data in Telegram's cloud
- **Biometric Authentication**: Use device biometrics
- **Geolocation**: Access user's location
- **File Downloads**: Native file download dialogs
- **Media Sharing**: Share content to Telegram chats

## Step 7: Bot Commands Setup

Configure bot commands with BotFather:

```
/start - Start using Arkade Wallet
/wallet - Open wallet interface
/help - Get help and support
/settings - Access wallet settings
```

## Step 8: Privacy and Security

### Required Considerations

1. **Data Privacy**: Clearly state what data you collect
2. **Secure Storage**: Use Telegram's Cloud Storage for sensitive data
3. **HTTPS Only**: Never use HTTP in production
4. **Input Validation**: Validate all user inputs
5. **Rate Limiting**: Implement proper rate limiting

### Privacy Policy Template

Create a privacy policy that includes:
- What data is collected from Telegram
- How user data is processed
- Data retention policies
- User rights and controls

## Step 9: Submission and Distribution

### App Store Alternative Distribution

Since this is a Telegram Mini App, you can distribute it through:

1. **Direct Bot Link**: `https://t.me/your_bot_username`
2. **Mini App Link**: `https://t.me/your_bot_username?startattach`
3. **Inline Sharing**: Users can share your Mini App in chats
4. **Telegram Channel/Group Promotion**

### Attachment Menu Integration

For major apps, you can apply for attachment menu integration:

```
https://t.me/your_bot_username?startattach=command
```

This allows users to access your app from any chat's attachment menu.

## Troubleshooting

### Common Issues

1. **HTTPS Requirement**: Ensure your domain has valid SSL
2. **CORS Issues**: Configure proper CORS headers
3. **Theme Not Working**: Check Telegram script loading
4. **Features Not Available**: Verify Mini App is properly configured with BotFather

### Debug Mode

Enable debug mode to troubleshoot:
- **iOS**: Settings → Allow Web View Inspection
- **Android**: Settings → Enable WebView Debug
- **Desktop**: Settings → Advanced → Experimental → Enable webview inspection

## Monitoring and Analytics

### Recommended Tools

1. **Sentry**: Error tracking and performance monitoring
2. **Google Analytics**: User behavior analytics
3. **Telegram Bot Analytics**: Track bot usage
4. **Uptime Monitoring**: Ensure your app stays online

### Bot Analytics Example

```javascript
// Track Mini App launches
bot.on('web_app_data', (ctx) => {
  console.log('Mini App data received:', ctx.webAppData)
  // Send to your analytics service
})
```

## Maintenance

### Regular Tasks

1. **Monitor Error Logs**: Check Sentry or similar services
2. **Update Dependencies**: Keep packages up to date
3. **SSL Certificate Renewal**: Ensure certificates don't expire
4. **Bot Performance**: Monitor bot response times
5. **User Feedback**: Collect and respond to user feedback

### Updates

To update your Mini App:
1. Build new version
2. Deploy to hosting platform
3. No changes needed in Telegram (uses same URL)
4. Users get updates automatically

## Support and Documentation

- [Telegram Mini Apps Documentation](https://core.telegram.org/bots/webapps)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [React Documentation](https://react.dev/)
- [Ionic React Documentation](https://ionicframework.com/docs/react)

## Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Environment variables properly secured
- [ ] User input validation implemented
- [ ] Rate limiting in place
- [ ] Error handling doesn't expose sensitive data
- [ ] Privacy policy created and accessible
- [ ] Terms of service defined
- [ ] Backup strategy implemented
- [ ] Monitoring and alerting configured
- [ ] Regular security updates scheduled