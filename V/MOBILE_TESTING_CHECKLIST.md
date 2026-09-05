# Mobile PWA Testing Checklist

## 1. Responsive Design
- [ ] Layout adapts correctly on screens: 320px, 375px, 414px, 768px, 1024px, 1440px
- [ ] Touch targets are at least 44x44px
- [ ] Text is readable without zooming (minimum 16px for body text)
- [ ] No horizontal scrolling on any page
- [ ] Images scale correctly without distortion
- [ ] Forms are usable on mobile (inputs don't zoom on focus)
- [ ] Navigation is accessible with one hand
- [ ] Bottom navigation is visible and functional
- [ ] Safe areas (notch, home indicator) are respected

## 2. PWA Features
- [ ] Service worker registers successfully
- [ ] App can be added to home screen
- [ ] App launches in standalone mode (no browser UI)
- [ ] Splash screen displays correctly
- [ ] App icon displays correctly on home screen
- [ ] App works offline (cached pages load)
- [ ] Push notifications are received
- [ ] Background sync works for queued actions
- [ ] Update prompt appears when new version is available

## 3. Touch & Gestures
- [ ] Swipe left/right navigates between sections
- [ ] Pull-to-refresh works on supported pages
- [ ] Tap targets respond immediately (no 300ms delay)
- [ ] Long press doesn't trigger unwanted browser actions
- [ ] Scroll is smooth and performant
- [ ] Bottom sheet can be dismissed by swiping down
- [ ] Double-tap to zoom is disabled where appropriate

## 4. Camera & Permissions
- [ ] Camera permission prompt appears on first use
- [ ] Microphone permission prompt appears on first use
- [ ] Location permission prompt appears when needed
- [ ] Notification permission prompt appears
- [ ] Permissions can be granted/denied gracefully
- [ ] Camera works in portrait and landscape
- [ ] Front/back camera switching works
- [ ] Video stream adapts to network conditions

## 5. Video Chat
- [ ] Video fills screen in portrait mode
- [ ] Picture-in-picture local video is positioned correctly
- [ ] Controls auto-hide after 3 seconds
- [ ] Controls reappear on tap
- [ ] Mute/unmute works with visual feedback
- [ ] Camera toggle works with visual feedback
- [ ] End call button is easily accessible
- [ ] Timer is visible during call
- [ ] Extend button appears when time is running low
- [ ] Video quality adapts to bandwidth

## 6. Performance
- [ ] First contentful paint < 2 seconds on 3G
- [ ] Time to interactive < 5 seconds on 3G
- [ ] Images are lazy loaded
- [ ] Videos use adaptive bitrate
- [ ] No layout shifts during loading
- [ ] Scroll performance is smooth (60fps)
- [ ] Battery usage is reasonable during video calls
- [ ] Memory usage doesn't grow unbounded

## 7. Offline Capability
- [ ] Cached pages load without network
- [ ] Offline page displays when no cache available
- [ ] Forms queue submissions for later sync
- [ ] Error messages are clear when offline
- [ ] Offline banner appears when connection is lost
- [ ] App recovers gracefully when connection returns

## 8. Push Notifications
- [ ] Notification permission is requested at appropriate time
- [ ] Notifications display with correct icon and badge
- [ ] Tapping notification opens correct page
- [ ] Notification actions work (open, dismiss)
- [ ] Notifications are grouped appropriately
- [ ] Sound/vibration settings are respected

## 9. Device-Specific
### iOS
- [ ] Safari "Add to Home Screen" works
- [ ] Status bar style is correct
- [ ] Safe areas are respected (notch, home indicator)
- [ ] No rubber-band scrolling issues
- [ ] Video autoplay works (with user gesture)

### Android
- [ ] Chrome install banner appears
- [ ] Back button navigation works correctly
- [ ] Hardware keyboard doesn't break layout
- [ ] Split-screen mode works
- [ ] Dark mode follows system setting

## 10. Accessibility
- [ ] All interactive elements have accessible labels
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader announces content correctly
- [ ] Focus order is logical
- [ ] Reduced motion preference is respected
- [ ] High contrast mode is supported
- [ ] Font scaling doesn't break layout

## 11. Network Conditions
- [ ] App works on 2G (slow, limited functionality)
- [ ] App works on 3G (functional, some delays)
- [ ] App works on 4G/LTE (full functionality)
- [ ] App works on WiFi (full functionality)
- [ ] App handles network drops gracefully
- [ ] App recovers when network returns
- [ ] Data saver mode is respected

## 12. Browser Compatibility
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Samsung Internet
- [ ] Edge Mobile
