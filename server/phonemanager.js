// @ts-check
import chalk from 'chalk'

import Phone from "./model/phone.js";
import Location from './model/location.js';
/** @typedef {import("socket.io").Server} Server */
/** @typedef {import("./model/simulation.js").default} Simulation */
/** @typedef {import("./model/phonebookentry.js").default} PhonebookEntry */
/** @typedef {import("./model/train.js").default} Train */

export default class PhoneManager {
  /** @type {Phone[]} */
  phones = [];

  /** @type {Simulation[]} */
  sims = []

  /**
   * 
   * @param {Server} io 
   */
  constructor(io) {
    this.io = io;
  }
  /**
   * 
   * @param {Simulation} sim 
   */
  generatePhonesForSim(sim) {
    //Create a phone for each panel in the sim.
    sim.panels.forEach((panel) => {
      const phone = new Phone(sim.id +'_' + panel.id, panel.name, Phone.TYPES.FIXED, new Location(sim.id, panel.id))
      panel.phone = phone;
      this.phones.push(phone);
    })

    //Create a phone for Control
    // TODO: Add ability to configure additional phones for the Sim.
    this.phones.push(new Phone(sim.id + "_control", 'Control', Phone.TYPES.FIXED, new Location(sim.id)));

    this.sims.push(sim)

    //console.log(chalk.yellow('generatePhonesForSim'), this.phones);
  }

  /**
   * 
   * @param {Train} train 
   * @returns {Phone}
   */
  generatePhoneForTrain(train) {
    //TODO: This needs a lot of work!
    const phone = new Phone(train.getSUID(), train.getHeadcode(), Phone.TYPES.TRAIN)
    phone.setCarrier(train);
    this.phones.push(phone);
    return phone;
  }

  generatePhoneForPerson(number, name, type=Phone.TYPES.MOBILE, location = null, hidden=false) {
    console.log(chalk.yellow('generatePhoneForPerson'), arguments)
    if(!this.phones.some(p => p.getId() === number)) {
      console.log('created phone')
      this.phones.push(new Phone(number, name, type, location, hidden));
      return true;
    }else {
      console.error('Attempting to create phone that already exists.')
      return false;
    }
  }

  /**
   * 
   * @param {Phone} phone 
   * @returns {PhonebookEntry[]}
   */
  getSpeedDialForPhone(phone) {
    let phones = [];
    const sim = this.sims.find(x => x.id === phone.getLocation().simId);
    const neighbourPhones = sim.panels.filter(x => x.neighbours.some(n => n.panelId === phone.getLocation().panelId)).map(p => p.phone);
    //const neighbourPhones = this.phones.filter(x => neighbourPanels.find(y => y.id === x.getId()));
    phones = phones.concat(neighbourPhones);
    const control = this.phones.filter(x => x.getId() === sim.id + "_control");
    return phones.concat(control).map(p => p.toSimple());
  }

  /**
   * 
   * @param {Phone} phone 
   * @returns {PhonebookEntry[]}
   */
  getTrainsAndMobilesForPhone(phone) {
    const trainPhones = this.phones.filter(p => p.getLocation().simId === phone.getLocation().simId && p.isType(Phone.TYPES.TRAIN)).map(p => p.toSimple());
    const mobilePhones = this.phones.filter(p => p.getLocation().simId === phone.getLocation().simId && p.isType(Phone.TYPES.MOBILE)).map(p => p.toSimple());
    const allPhones = trainPhones.concat(mobilePhones);
    return allPhones;
  }

  /**
   * 
   * @param {Phone} phone 
   * @returns {Phone[]}
   */
  getRECRecipientsForPhone(phone) {
    let phones = [];
    const sim = this.sims.find(s => s.id === phone.getLocation().simId);
    const neighbourPanels = sim.panels.filter(p => p.neighbours.some(n => n.panelId === phone.getLocation().panelId));
    const neighbourPhones = this.phones.filter(p => p.getDiscordId() !== null && neighbourPanels.find(n => n.id === p.getId()));
    phones = phones.concat(neighbourPhones);
    const control = this.phones.filter(x => x.getId() === sim.id + "_control" && x.getDiscordId() !== null);
    return phones.concat(control).map(p => p.toSimple());
  }

  /**
   * 
   * @param {string} phoneId 
   * @returns {(Phone | undefined)}
   */
  getPhone(phoneId) {
    return this.phones.find(p => p.getId() === phoneId);
  }

  getAllPhones() {
    return this.phones.map(p => p.toSimple());
  }

  /**
   * 
   * @param {Phone} phone 
   * @param {string} discordId 
   * @returns 
   */
  assignPhone(phone, discordId) {
    if (typeof phone === 'undefined') {
      console.log(chalk.yellow('assignPhone'), 'Phone is undefined', discordId);
      return false;
    }
    phone.setDiscordId(discordId);
    this.sendPhonebookUpdateToPlayer(discordId);
    return true;
  }

  /**
   * 
   * @param {Phone} phone 
   * @returns 
   */
  unassignPhone(phone) {
    if (typeof phone === 'undefined') {
      console.log(chalk.yellow('assignPhone'), 'Phone is undefined');
      return false;
    }
    this.sendPhonebookUpdateToPlayer(phone.getDiscordId());
    phone.setDiscordId(null);
    return true;
  }

  unassignPhonesForDiscordId(discordId) {
    const phones = this.getPhonesForDiscordId(discordId);
    phones.forEach(p => p.setDiscordId(null));
    this.sendPhonebookUpdateToPlayer(discordId);
  }

  getPhonesForDiscordId(discordId) {
    const phones = this.phones.filter(x => x.getDiscordId() === discordId);
    return phones;
  }

  sendPhonebookUpdateToPlayer(discordId) {
    const phones = this.getPhonesForDiscordId(discordId);
    phones.forEach((p) => { p.setSpeedDial(this.getSpeedDialForPhone(p)); p.setTrainsAndMobiles(this.getTrainsAndMobilesForPhone(p)) });
    this.io.to(discordId).emit('phonebookUpdate', phones.map(p => p.getPhoneBook()));
  }
}