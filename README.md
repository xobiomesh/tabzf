# TabZF - Fuzzy Tab Finder

**TabZF** is a fast and elegant Chrome extension that helps you find and switch between your open tabs using fuzzy search.

![TabZF Icon](icon128.png)

## Features

- **Fuzzy Search**: Quickly find the tab you're looking for by typing any part of its title or URL. Powered by [Fuse.js](https://www.fusejs.io/).
- **Sorting Options**:
  - **Recent**: Sort tabs by last accessed time, featuring **chronological separators** (Today, Yesterday, etc.) for better organization.
  - **Order**: Sort tabs by their position in the window.
  - **Alphabetical**: Sort tabs by title.
- **Calendar Filter**: A new calendar view that visualizes tab density per day. Select one or multiple days to filter your results to specific dates.
- **Keyboard Friendly**:
  - `ArrowUp` / `ArrowDown` to navigate through results.
  - `Enter` to focus the selected tab.
- **Modern Interface**: A clean, focused UI that stays out of your way.

## Installation

### For Developers

1.  Clone this repository or download the source code as a ZIP file and extract it.
2.  Open Google Chrome.
3.  Go to the extensions management page by typing `chrome://extensions/` in the address bar.
4.  Enable **Developer mode** by clicking the toggle switch in the top right corner.
5.  Click the **Load unpacked** button.
6.  Select the directory where you extracted/cloned the TabZF files.
7.  TabZF should now appear in your extensions list and toolbar.

## Usage

1.  Click the TabZF icon in your Chrome toolbar (or use a keyboard shortcut if you've configured one).
2.  Start typing to search for a tab.
3.  Use the mouse or arrow keys to select a result.
4.  Click or press `Enter` to switch to that tab.

## Permissions

- `tabs`: To query and focus your open tabs.
- `storage`: To remember your preferences (e.g., sort order).

## License

This project is open-source. Feel free to use and modify it as you wish.
