# auto copy : chrome extension #
Auto Copy is an extension for [Chrome](https://www.google.com/chrome/) and [Edge web](https://www.microsoft.com/en-us/edge) browsers. It will automatically copy any selected text to the clipboard.

Go to the [Chrome Web Store](https://chrome.google.com/webstore/detail/bijpdibkloghppkbmhcklkogpjaenfkg) or [Microsoft Edge](https://microsoftedge.microsoft.com/addons/detail/auto-copy/dccbmdgkdanddjmfehgigdhcijadgfkc) Addons to [install the extension.

# Donate #
If you like this extension please consider donating a little to help support the development effort. Thanks!

Paypal: [![paypal](https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif)](https://paypal.me/stratusnine)

CashApp: [$stratusnine](https://cash.app/?to=$stratusnine)

### Note: Once this extension is installed you must reload any open tabs in order for it to work. ####

# Features #
Auto Copy has several features that are configurable from the options page:

- Notification on copy
- Sync settings across browsers
- Remove selection on copy
- Enable / disable in text boxes
- Enable / disable in content editable elements
- Paste on middle click
- Use modifier key(s) to enable / disable auto copy
- Use modifier key(s) to copy as a link
- Always copy as a link
- Copy without formatting
- Include informational comment with optional formatting items
- Use modifier key(s) to enable / disable informational comment
- Blocklist websites to automatically disable the extension
- Clear clipboard on copy with configurable delay
- Delay copy with configurable delay
- Trim leading/trailing whitespace from selection
- Native system notification on copy

# Change Log #

- Version 5.0.0: Updated for manifest v3
- Version 5.0.0: Sync settings across browsers
- Version 4.2.1: Bug fix: extension did not work on localhost
- Version 4.2.1: Bug fix: version number was wrong on the options page
- Version 4.2.0: Added clear clipboard
- Version 4.2.0: Added trim whitespace
- Version 4.2.0: Added native system notifications
- Version 4.2.0: Added copy delay
- Version 4.2.0: Renamed blacklist to blocklist
- Version 4.1.7: Added Privacy Policy
- Version 4.1.7: Published as an Microsoft Edge Addon
- Version 4.1.7: Allow for enable / disable of informational comment via a modifier key
- Version 4.1.7: Enabled alert on copy by default
- Version 4.1.7: Updated look and feel of options page
- Version 4.1.7: bug fix: double clicking a selection would fail to copy after triple clicking
- Version 4.1.7: bug fix: ‘Add the comment to the end of the copied text’ option failed to restore when options page was reloaded or relaunched
- Version 4.1.7: bug fix: ‘Only include the comment if more than X words are selected’ would cause the selected text to appear twice in the clipboard
- Version 4.1.7: bug fix: Enable / disable auto copy using a modifier key failed to work reliably
- Version 4.1.6: bug fixes
- Version 4.1.5: Added more comment formatting options for date/time information.
- Version 4.1.5: Added support for debugging to console.
- Version 4.1.4: Allowed for alert on copy notice to be configurable.
- Version 4.1.4: Eliminated delay on triple click.
- Version 4.1.4: Bug fix: did not detect nested contentEditable elements.
- Version 4.1.3: Bug fix: auto copy notification text was unreadable on dark backgrounds.
- Version 4.1.3: Bug fix: changes to click handling broke double click and drag; this capability has been restored.
- Version 4.1.2: Added support to disable in content editable elements.
- Version 4.1.2: Added support to allow ctrl/shift to enable or disable the extension.
- Version 4.1.2: Added to manifest so extension can work on any url type.
- Version 4.1.2: Bug fix: auto copy would execute on text deselection, or clicking without selecting anything.
- Version 4.1.2: Bug fix: stopped multiple copies when double or triple clicking.
- Version 4.0.0: Added support to disable with ctrl or shift key.
- Version 4.0.0: Added support to copy as a link (always or using ALT key).
- Version 4.0.0: Added support to remove selection after copy.
- Version 4.0.0: Added support to notify on copy.
- Version 4.0.0: Added support to blocklist URLs to disable the extension.
- Version 4.0.0: Copy with comment and copy without formatting no longer rely on each other (requires Chrome v43 or later).
- Version 4.0.0: Re-enabled support for copy with formatting (requires Chrome v43 or later).
- Version 4.0.0: Updated paste on middle click handling.
- Version 3.0.0: Added support to blocklist websites to disable the extension.
- Version 2.1.1: Fixed a bug that prevented the extension from working if the options hadn’t ever been saved.
- Version 2.1.0: Added option to include the comment only if a minimum number of words are selected.
- Version 2.0.0: Added paste on middle click. Now requires Chrome 13 or higher which provides clipboard support in the extension API. Added ability to custom format the comment with macro expansion.
- Version 1.0.6: Update artwork to meet the requirements of the new Chrome Store.
- Version 1.0.5: Implemented a work-around for Chrome 6
- Version 1.0.4: Implemented fix for beeping sound that some users were experiencing. gregg submitted the patch to fix this issue. Thanks, gregg. The problem only occurred when the “Copy as plain text” option was enabled and a web page was clicked but no selection was made.
- Version 1.0.3: Updated the manifest description (12/11/2009)
- Version 1.0.2: Added two requested features. Copy as plain text (i.e. strip any formatting), and include the page URL with the copied text. (12/11/2009)
- Version 1.0.1: Bug fix — Selecting text in a text field when the text field option wasn’t enabled would result in copying the selection to the clipboard if the mouse cursor moved outside of the text field before the mouseup event occurred. (12/09/2009)
- Version 1.0.0: Initial release (12/08/2009)

# Notes #
Also, content-scripts are automatically disabled in the Chrome Web Store for security reasons. Please keep this in mind when testing the extension.

# Attributions #
Many thanks to [Eric Porter](http://www.ericportfolio.com/) for creating the icon and promotional image.\

# Privacy Policy #
Click [here](https://stratusnine.com/software/auto-copy/auto-copy-privacy-policy/) to view the privacy policy

# Contact #
If you have a feature request, bug fix, or general feedback please feel free to get in touch with me on [email](mailto:autocopy@jamiehill.com).
