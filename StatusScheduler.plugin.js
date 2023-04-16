/**
 * @name StatusScheduler
 * @author Sithi5
 * @description Set a custom status based on the time of day
 * @version 1.0.0
 * @source https://github.com/Sithi5/BetterDiscordStatusScheduler
 */

const UserSettingsProtoUtils = BdApi.Webpack.getModule(
  (m) => {
    return (
      m.ProtoClass && m.ProtoClass.typeName.endsWith('.PreloadedUserSettings')
    );
  },
  { first: true, searchExports: true }
);

const daysList = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const defaultStatusConfig = {
  working: {
    start: '09:00',
    end: '18:00',
    days: [0, 1, 2, 3, 4],
    status: 'dnd',
    customText: 'Working',
    emojiName: '',
  },
  onlineWeekdays: {
    start: '18:00',
    end: '23:00',
    days: [0, 1, 2, 3, 4],
    status: 'online',
    customText: 'Online',
    emojiName: '',
  },
  onlineWeekend: {
    start: '09:00',
    end: '23:00',
    days: [5, 6],
    status: 'online',
    customText: 'Online',
    emojiName: '',
  },
  idle: {
    start: '23:00',
    end: '09:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    status: 'idle',
    customText: 'Idle',
    emojiName: '',
  },
};

let statusConfig = JSON.parse(JSON.stringify(defaultStatusConfig));

module.exports = (meta) => ({
  intervalId: null,

  /**
   * Updates the remote status to the param `toStatus`
   * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
   * @param {string} customText
   * @param {string} emojiName
   */
  updateStatus(toStatus, customText = '', emojiName = '') {
    console.log('Updating status to', toStatus);
    UserSettingsProtoUtils.updateAsync(
      'status',
      (statusSetting) => {
        statusSetting.status.value = toStatus;
        statusSetting.customStatus.text = customText;
        statusSetting.customStatus.emojiName = emojiName;
      },
      0
    );
  },

  /**
   * Sets the status based on the current time and day of the week
   * @private
   * @memberof StatusScheduler
   * @returns {void}
   * */
  setStatusFromDate() {
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7; // Adjust current day to start from Monday (0)
    const currentTime = `${now.getHours()}:${now.getMinutes()}`;
    let statusToUpdate = null;
    for (const key in statusConfig) {
      const { start, end, days, status, customText, emojiName } =
        statusConfig[key];
      if (
        currentTime >= start &&
        currentTime <= end &&
        days.includes(currentDay)
      ) {
        statusToUpdate = status;
        this.updateStatus(status, customText, emojiName);
        break;
      }
    }

    if (!statusToUpdate) {
      // Default to 'online' if no matching status config found
      this.updateStatus('online');
    }
  },

  /**
   * Sets the status to 'dnd' if the current second is even, otherwise sets it to 'online'
   * Used for testing
   * @private
   * @memberof StatusScheduler
   * @returns {void}
   **/
  setStatusForTesting() {
    const now = new Date();
    const currentSec = now.getSeconds();
    if (currentSec % 2 === 0) {
      this.updateStatus(
        statusConfig.working.status,
        statusConfig.working.customText,
        statusConfig.working.emojiName
      );
    } else {
      this.updateStatus(
        statusConfig.onlineWeekdays.status,
        statusConfig.onlineWeekdays.customText,
        statusConfig.onlineWeekdays.emojiName
      );
    }
  },

  start() {
    this.setStatusFromDate();
    this.intervalId = setInterval(() => {
      console.log('Checking status...');
      this.setStatusForTesting();
    }, 5000);
  },

  stop() {
    this.updateStatus('online');
    clearInterval(this.intervalId);
  },

  resetSettings() {
    statusConfig = JSON.parse(JSON.stringify(defaultStatusConfig));
    for (const key in statusConfig) {
      const { start, end, days } = statusConfig[key];

      const startTimeInput = document.querySelector(
        `input[name="${key}-start-time"]`
      );
      startTimeInput.value = start;

      const endTimeInput = document.querySelector(
        `input[name="${key}-end-time"]`
      );
      endTimeInput.value = end;

      daysList.forEach((day, index) => {
        const dayRadio = document.querySelector(
          `input[name="${key}-day-${index}"]`
        );
        dayRadio.checked = days.includes(index);
      });
    }
  },

  getSettingsPanel() {
    // TODO: Improve a lot here, better styling, test if functional etc
    const settingsPanel = document.createElement('div');

    settingsPanel.id = 'status-scheduler-settings';
    settingsPanel.style.color = 'white';

    // Add the style tag with the required CSS
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
    .day-wrapper {
      display: inline-block;
      margin-right: 10px;
    }
    `;
    settingsPanel.appendChild(styleTag);

    // Reset config button
    const resetButton = document.createElement('button');
    resetButton.textContent = 'Reset to Default';
    resetButton.style.marginTop = '1rem';
    resetButton.addEventListener('click', () => {
      this.resetSettings();
    });
    settingsPanel.appendChild(resetButton);

    for (const key in statusConfig) {
      const { start, end, days, status, customText, emojiName } =
        statusConfig[key];

      const configSetting = document.createElement('div');
      configSetting.id = `status-scheduler-${key}`;
      configSetting.className = 'status-scheduler-config';

      const keyLabel = document.createElement('span');
      keyLabel.textContent = `${key}: `;
      keyLabel.style.fontWeight = 'bold';
      configSetting.appendChild(keyLabel);

      const startTimeLabel = document.createElement('span');
      startTimeLabel.textContent = `Start time: `;
      configSetting.appendChild(startTimeLabel);

      const startTimeInput = document.createElement('input');
      startTimeInput.type = 'time';
      startTimeInput.name = `${key}-start-time`;
      startTimeInput.value = start;
      configSetting.appendChild(startTimeInput);

      const endTimeLabel = document.createElement('span');
      endTimeLabel.textContent = `End time: `;
      configSetting.appendChild(endTimeLabel);

      const endTimeInput = document.createElement('input');
      endTimeInput.type = 'time';
      endTimeInput.name = `${key}-end-time`;
      endTimeInput.value = end;
      configSetting.appendChild(endTimeInput);

      const daysWrapper = document.createElement('div');
      daysWrapper.className = 'days-wrapper';
      daysList.forEach((day, index) => {
        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'day-wrapper';

        const dayRadio = document.createElement('input');
        dayRadio.type = 'checkbox';
        dayRadio.name = `${key}-day-${index}`;
        dayRadio.value = index;
        dayRadio.checked = days.includes(index);
        dayRadio.className = 'day-radio';
        dayWrapper.appendChild(dayRadio);

        const dayLabel = document.createElement('label');
        dayLabel.htmlFor = `${key}-day-${index}`;
        dayLabel.textContent = day;
        dayWrapper.appendChild(dayLabel);

        daysWrapper.appendChild(dayWrapper);
      });

      configSetting.appendChild(daysWrapper);

      const removeButton = document.createElement('button');
      removeButton.innerHTML = '&#10006;';
      removeButton.className = 'remove-config-button';
      removeButton.addEventListener('click', () => {
        settingsPanel.removeChild(configSetting);
        delete statusConfig[key];
      });
      configSetting.appendChild(removeButton);

      settingsPanel.append(configSetting);
    }
    return settingsPanel;
  },
});
