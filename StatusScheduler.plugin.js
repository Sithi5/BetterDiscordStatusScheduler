/**
 * @name StatusScheduler
 * @author Sithi5
 * @description Set a custom status based on the time of day
 * @version 1.0.1
 * @source https://github.com/Sithi5/BetterDiscordStatusScheduler
 */

INTERVAL_SECONDS = 60;
INTERVAL_TIME = 1000 * INTERVAL_SECONDS;

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

const statusTypes = ['dnd', 'online', 'invisible', 'idle'];

const defaultStatus = {
  start: '09:00',
  end: '18:00',
  days: [0, 1, 2, 3, 4],
  status: 'dnd',
  customStatus: 'Working',
  emojiName: '',
};

const defaultStatusConfig = {
  working: {
    start: '09:00',
    end: '18:00',
    days: [0, 1, 2, 3, 4],
    status: 'dnd',
    customStatus: 'Working',
    emojiName: '',
  },
  onlineWeekdays: {
    start: '18:00',
    end: '23:00',
    days: [0, 1, 2, 3, 4],
    status: 'online',
    customStatus: 'Online',
    emojiName: '',
  },
  onlineWeekend: {
    start: '09:00',
    end: '23:00',
    days: [5, 6],
    status: 'online',
    customStatus: 'Weekend',
    emojiName: '😎',
  },
  invisible: {
    start: '00:00',
    end: '09:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    status: 'invisible',
    customStatus: 'Offline',
    emojiName: '',
  },
  idleEvening: {
    start: '23:00',
    end: '23:59',
    days: [0, 1, 2, 3, 4, 5, 6],
    status: 'idle',
    customStatus: 'Idle',
    emojiName: '',
  },
};

let statusConfig = JSON.parse(JSON.stringify(defaultStatusConfig));

module.exports = (meta) => ({
  intervalId: null,

  /**
   * Updates the remote status to the param `toStatus`
   * @param {('online'|'idle'|'invisible'|'dnd')} toStatus
   * @param {string} customStatus
   * @param {string} emojiName
   */
  updateStatus(toStatus, customStatus = '', emojiName = '') {
    console.log('Updating status...');

    UserSettingsProtoUtils.updateAsync(
      'status',
      (statusSetting) => {
        console.log('Old status:', statusSetting?.status?.value);
        console.log('Old Custom status:', statusSetting?.customStatus?.text);
        console.log('Old Emoji name:', statusSetting?.customStatus?.emojiName);
        console.log('---------------------');
        console.log('New status:', toStatus);
        console.log('New Custom status:', customStatus);
        console.log('New Emoji name:', emojiName);
        if (statusSetting?.customStatus) {
          statusSetting.customStatus.text = customStatus;
          statusSetting.customStatus.emojiName = emojiName;
        }
        statusSetting.status.value = toStatus;
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
      const { start, end, days, status, customStatus, emojiName } =
        statusConfig[key];
      const [startHours, startMinutes] = start.split(':');
      const [endHours, endMinutes] = end.split(':');
      const startDate = new Date();
      const endDate = new Date();
      startDate.setHours(startHours, startMinutes, 0, 0);
      endDate.setHours(endHours, endMinutes, 0, 0);
      if (now >= startDate && now <= endDate && days.includes(currentDay)) {
        console.log('currentTime', currentTime);
        console.log('start', start);
        console.log('end', end);
        statusToUpdate = status;
        this.updateStatus(status, customStatus, emojiName);
        break;
      }
    }

    if (!statusToUpdate) {
      // Default to 'online' if no matching status config found
      this.updateStatus('idle', '', '');
    }
  },

  start() {
    this.setStatusFromDate();
    this.intervalId = setInterval(() => {
      console.log('Checking status...');
      this.setStatusFromDate();
    }, INTERVAL_TIME);
  },

  stop() {
    this.updateStatus('online');
    clearInterval(this.intervalId);
  },

  resetSettingsHandler() {
    statusConfig = JSON.parse(JSON.stringify(defaultStatusConfig));
    this.updateSettingsPanel();
  },

  removeConfigButtonClickHandler(event) {
    if (event.target.classList.contains('remove-config-button')) {
      const key = event.target.dataset.key;
      const configSetting = document.getElementById(`status-scheduler-${key}`);
      configSetting.remove();
      delete statusConfig[key];
    }
  },

  updateSettingsPanel() {
    this.settingsPanel.innerHTML = '';

    // Add the style tag with the required CSS
    const styleTag = document.createElement('style');
    styleTag.innerHTML = `
    .row {
      display: flex;
      align-items: center;
      margin-bottom: 1rem;
    }
    .config-container {
      display: flex;
    }
    .inline-element {
      margin-right: 1rem;
    }
    .center {
      justify-content: center;
    }
    .bold {
      font-weight: bold;
    }
  `;
    this.settingsPanel.appendChild(styleTag);

    for (const key in statusConfig) {
      const { start, end, days, status, customStatus, emojiName } =
        statusConfig[key];

      const keyContainer = document.createElement('div');
      keyContainer.className = 'row center';
      keyContainer.style.paddingTop = '1rem';
      this.settingsPanel.appendChild(keyContainer);

      const keyName = document.createElement('span');
      keyName.textContent = `${key}: `;
      keyName.className = 'bold';
      keyContainer.appendChild(keyName);

      const configContainer = document.createElement('div');
      configContainer.className = 'row config-container';
      this.settingsPanel.appendChild(configContainer);

      const startTimeInput = document.createElement('input');
      startTimeInput.type = 'time';
      startTimeInput.name = `${key}-start-time`;
      startTimeInput.value = start;
      startTimeInput.addEventListener('change', (event) => {
        statusConfig[key].start = event.target.value;
      });
      configContainer.appendChild(startTimeInput);

      const endTimeInput = document.createElement('input');
      endTimeInput.type = 'time';
      endTimeInput.name = `${key}-end-time`;
      endTimeInput.value = end;
      endTimeInput.addEventListener('change', (event) => {
        statusConfig[key].end = event.target.value;
      });
      configContainer.appendChild(endTimeInput);

      const customStatusInput = document.createElement('input');
      customStatusInput.type = 'text';
      customStatusInput.name = `${key}-custom-text`;
      customStatusInput.value = customStatus;
      customStatusInput.placeholder = 'Custom status';
      customStatusInput.addEventListener('input', (event) => {
        statusConfig[key].customStatus = event.target.value;
      });
      configContainer.appendChild(customStatusInput);

      const emojiInput = document.createElement('input');
      emojiInput.type = 'text';
      emojiInput.inputMode = 'emoji';
      emojiInput.name = `${key}-emoji-name`;
      emojiInput.value = emojiName;
      emojiInput.placeholder = 'Emoji input';
      emojiInput.addEventListener('input', (event) => {
        statusConfig[key].emojiName = event.target.value;
      });
      configContainer.appendChild(emojiInput);

      const statusDropdown = document.createElement('select');
      statusDropdown.name = `${key}-status-dropdown`;
      statusDropdown.className = 'status-dropdown';

      statusTypes.forEach((statusType) => {
        const option = document.createElement('option');
        option.value = statusType;
        option.textContent = statusType;
        if (statusType === status) {
          option.setAttribute('selected', 'selected');
        }
        statusDropdown.appendChild(option);
      });
      statusDropdown.addEventListener('change', (event) => {
        statusConfig[key].status = event.target.value;
      });
      configContainer.appendChild(statusDropdown);

      const daysContainerWrapper = document.createElement('div');
      daysContainerWrapper.className = 'row';
      this.settingsPanel.appendChild(daysContainerWrapper);

      const daysContainer = document.createElement('div');
      daysContainer.className = 'inline-element';
      daysContainerWrapper.appendChild(daysContainer);

      daysList.forEach((day, index) => {
        const dayLabel = document.createElement('label');
        dayLabel.textContent = day;
        dayLabel.className = 'day-label';

        const dayInput = document.createElement('input');
        dayInput.type = 'checkbox';
        dayInput.name = `${key}-days-${index}`;
        dayInput.value = index;
        dayInput.className = 'day-checkbox';

        if (days.includes(index)) {
          dayInput.setAttribute('checked', 'checked');
        }

        dayInput.addEventListener('change', (event) => {
          if (event.target.checked) {
            if (!statusConfig[key].days.includes(index)) {
              statusConfig[key].days.push(index);
            }
          } else {
            statusConfig[key].days = statusConfig[key].days.filter(
              (dayIndex) => dayIndex !== index
            );
          }
        });
        daysContainer.appendChild(dayInput);
        daysContainer.appendChild(dayLabel);
      });
      const deleteConfigButton = document.createElement('button');
      deleteConfigButton.innerHTML = '&#10006;';
      deleteConfigButton.className = 'delete-config-button';
      deleteConfigButton.addEventListener('click', () => {
        delete statusConfig[key];
        this.updateSettingsPanel();
      });
      configContainer.appendChild(deleteConfigButton);
    }

    const addConfigInputName = document.createElement('input');
    addConfigInputName.type = 'text';
    addConfigInputName.placeholder = 'Enter new configuration name';
    this.settingsPanel.appendChild(addConfigInputName);

    const addConfigButton = document.createElement('button');
    addConfigButton.textContent = 'Add Row';
    addConfigButton.addEventListener('click', () => {
      const configName = addConfigInputName.value;
      if (
        !configName ||
        configName === '' ||
        statusConfig[configName] !== undefined
      ) {
        console.log('Empty or invalid config name');
        return;
      }
      statusConfig[configName] = { ...defaultStatus };
      this.updateSettingsPanel();
    });
    this.settingsPanel.appendChild(addConfigButton);
    // Reset config button
    const resetSettingContainer = document.createElement('div');
    resetSettingContainer.className = 'row center';
    this.settingsPanel.appendChild(resetSettingContainer);

    const resetSettingsButton = document.createElement('button');
    resetSettingsButton.textContent = 'Reset to Default';
    resetSettingsButton.addEventListener('click', () => {
      this.resetSettingsHandler();
    });
    resetSettingContainer.appendChild(resetSettingsButton);
  },

  updateStatusConfig(key, field, value) {
    console.log('updateStatusConfig', key, field, value);
    statusConfig[key][field] = value;
    this.updateSettingsPanel();
  },

  getSettingsPanel() {
    this.settingsPanel = document.createElement('div');
    this.settingsPanel.id = 'status-scheduler-settings';
    this.settingsPanel.style.color = 'white';

    this.updateSettingsPanel();

    this.settingsPanel.addEventListener(
      'click',
      this.removeConfigButtonClickHandler
    );

    return this.settingsPanel;
  },
});
