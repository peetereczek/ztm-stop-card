class ZTMStopCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }
  
  version() { return "0.2.0"; }
  
  _getAttributes(hass, filter1) {
    var inmin = new Array(); //time delta
    var routeid = new Array(); //line number
    var vehicle = new Array(); //bus or tram
    var headsign = new Array(); //direction
    var icon = new Array();
    var routeobjarray = [];
    var station; //stop, station name
    var items; //counter in array
    
    function _filterName(stateObj, pattern) {
      let parts;
      let attr_id;
      let attribute;

      if (typeof (pattern) === "object") {
        parts = pattern["key"].split(".");
        attribute = pattern["key"];
      } else {
        parts = pattern.split(".");
        attribute = pattern;
      }
      attr_id = parts[2];

      if (attr_id.indexOf('*') === -1) {
        return stateObj == attribute;
      }
      const regEx = new RegExp(`^${attribute.replace(/\*/g, '.*')}$`, 'i');
      return stateObj.search(regEx) === 0;
    }
    
    var supportedItems = 8;
    var filters1 = new Array();
      filters1[3] = {key: "sensor."+ filter1 + ".direction"};
      filters1[2] = {key: "sensor."+ filter1 + ".departures"};
	  filters1[1] = {key: "sensor."+ filter1 + ".friendly_name"};
    
    const attributes = new Map();
    filters1.forEach((filter) => {
      const filters = [];

      filters.push(stateObj => _filterName(stateObj, filter));

      Object.keys(hass.states).sort().forEach(key => {
        Object.keys(hass.states[key].attributes).sort().forEach(attr_key => {
          if (filters.every(filterFunc => filterFunc(`${key}.${attr_key}`))) {
            attributes.set(`${key}.${attr_key}`, {
              value: `${hass.states[key].attributes[attr_key]} ${filter.unit||''}`.trim(),
            });
          }  
        });
      });
    });

    var attr = Array.from(attributes.keys());
    var re = /\d$/;
    attr.forEach(key => {
      var newkey = key.split('.')[2];
		
        switch (newkey) {
          case 'departures':
            inmin=attributes.get(key).value.split(",");
            break;
          case 'direction':
            headsign=attributes.get(key).value.split(",");
            break;
		  case 'friendly_name':
            station=attributes.get(key).value;
            break;
        }
      items = attributes.get(key).value.split(",").length;
      routeid = key.split("_")[1];
      if (/^\d{2}$/.test(routeid)) {
        vehicle = "tram";
        icon="tram";
      } else if (/^\d{3}$/.test(routeid)) {
        vehicle = "bus";
        icon="bus";
      } else if (/^n{1}-{0,1}(\d{2})$/.test(routeid)) {
        vehicle = "bus";
        icon="bus";
      } else if (/^l{1}-{0,1}(\d{1,2})$/.test(routeid)) {
        vehicle = "bus";
        icon="bus";
      } else if (/^s{1}\d{1,2}$/.test(routeid)) {
        vehicle = "rail";
        icon="train";
      } else if (/^m{1}\d{1}$/.test(routeid)) {
        vehicle = "subway";
        icon="train-variant";
      }
    });
    if ( items > 0 ) {
      for (var i=0; i < items; i++) {
          routeobjarray.push({
            key: routeid.toUpperCase(),
            vehicle: vehicle,
            inmin: inmin[i],
            headsign: headsign[i],
            icon: icon,
            station: station
          });
      }
    } else {
      routeobjarray.push({
        key: 'Brak linii',
        vehicle: '',
        inmin: '',
        headsign: 'w kierunku',
        icon: '',
        station: station
      }); 
    }
    return Array.from(routeobjarray.values());
  }
  
  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity');
    }
    config.filter

    const root = this.shadowRoot;
    if (root.lastChild) root.removeChild(root.lastChild);

    const cardConfig = Object.assign({}, config);
    const card = document.createElement('ha-card');
    const content = document.createElement('div');
    const style = document.createElement('style');
    style.textContent = `
      h3 {
        text-align: center;
        padding-top:15px;
      }
      table {
        width: 90%;
        padding: 0px 0px 16px 0px;
        border: none;
        margin-left: 16px;
        margin-right: 16px;
      }
      thead th {
        text-align: left;
      }
      tbody tr:nth-child(odd) {
        background-color: var(--paper-card-background-color);
        vertical-align: middle;
      }
      tbody tr:nth-child(even) {
        background-color: var(--secondary-background-color);
      }
      td {
        padding-left: 5px;
      }
      .emp {
         font-weight: bold;
         font-size: 120%;
      }
      .extraic {
         width: 1em;
         padding-left: 5px;
      }
      .bus {
         color: #44739e;
         width: 0.1em;
      }
      .trolleybus {
         color: #cc0000;
         width: 1.5em;
      }
      .tram {
         color: #e1e100;
         width: 1.5em;
      }
      .rail {
         color: #2ecc71;
         width: 1.5em;
      }
      .subway {
         width: 1.5em;
      }
    `;
    content.innerHTML = `
      <p id='station'>
      <table>
        <tbody id='attributes'>
        </tbody>
      </table>
    `;
    card.appendChild(style);
    card.appendChild(content);
    root.appendChild(card)
    this._config = cardConfig;
  }
  
  _updateContent(element, attributes) {
    element.innerHTML = `
      ${attributes.map((attribute) => `
        <tr>
          <td class="${attribute.vehicle}"><ha-icon icon="mdi:${attribute.icon}"></td>
          <td><span class="emp">${attribute.key}</span> w kierunku ${attribute.headsign} za ${attribute.inmin} min</td>
        </tr>
      `).join('')}
    `;
  }
  
  _updateStation(element, attributes) {
    element.innerHTML = `
      ${attributes.map((attribute) => `
        <h3>${attribute.station}</h3>
      `)[0]}
    `;
  }
  
  set hass(hass) {
    const config = this._config;
    const root = this.shadowRoot;

    let attributes = this._getAttributes(hass, config.entity.split(".")[1]);

    this._updateStation(root.getElementById('station'), attributes);
    this._updateContent(root.getElementById('attributes'), attributes);
  }

  getCardSize() {
    return 1;
  }
}

customElements.define('ztm-stop-card', ZTMStopCard);
