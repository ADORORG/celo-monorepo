import * as functions from 'firebase-functions'
const crypto = require('crypto')

const admin = require('firebase-admin')
admin.initializeApp(functions.config().firebase)

const REQUESTS_DB_NAME = 'celo-org-mobile-earn-pilot'
const REQUESTS_DB_URL = 'https://celo-org-mobile-earn-pilot.firebaseio.com'
const PILOT_PARTICIPANTS_DB_URL = 'https://celo-org-mobile-pilot.firebaseio.com'

const FIGURE_EIGHT_KEY = functions.config().envs.secret_key

exports.handleFigureEightConfirmation = functions.database
  .instance(REQUESTS_DB_NAME)
  .ref('requests/{uid}')
  .onWrite((change) => {
    const message = change.after.val()

    // Whenever a confirmation is written
    const { confirmed, userId, adjAmount, jobTitle, conversionId } = message.payload
    const signature = message.signature

    if (!confirmed) {
      // First request, will retrigger once confirmed
      return null
    }

    if (!validSignature(signature, JSON.stringify(message.payload))) {
      console.log('Invalid sig')
      return change.after.ref.update({
        valid: false,
      })
    }

    const participantsDb = admin
      .app()
      .database(PILOT_PARTICIPANTS_DB_URL)
      .ref('earnPilot/participants')
    const msgRoot = participantsDb.child(userId)
    msgRoot.transaction((earned: number) => {
      return (earned || 0) + adjAmount
    }) // TODO(anna) the earn and conversion updates are untested
    msgRoot.child('conversions').push({ conversionId, jobTitle, adjAmount })
    return change.after.ref.update({
      valid: true,
      updated: true,
    })
  })

const validSignature = (signature: string, params: string) => {
  if (!FIGURE_EIGHT_KEY) {
    console.log('Could not load figure eight key')
  }
  const digest = crypto
    .createHash('sha1')
    .update(JSON.stringify(params) + FIGURE_EIGHT_KEY)
    .digest('hex')
  console.log(`Digest ${digest} should equal signature ${signature}`)
  // return digest === signature // TODO enable security
  return true
}

const sanitizeId = (uid: string) => {
  // TODO may need to make lowercase
  return uid
}

enum PostType {
  INITIAL = 'INITIAL',
  CONFIRM = 'CONFIRM',
}

export const handlePost = functions.https.onRequest((request, response) => {
  const data = request.body
  const signature = data.signature

  if (!validSignature(signature, JSON.stringify(request.body.payload))) {
    console.info(`Received request ${JSON.stringify(data)} with invalid signature ${signature}`)
    response.status(401).send(`Unauthorized. Invalid signature: ${signature}`)
    return
  }

  const postType =
    data && typeof data.payload.conversion_id !== 'undefined' ? PostType.CONFIRM : PostType.INITIAL

  const requestsDb = admin
    .app()
    .database(REQUESTS_DB_URL)
    .ref('confirmations')

  if (postType === PostType.INITIAL) {
    const { amount, adjusted_amount, uid } = data.payload
    console.info(`Initial request for payment of ${adjusted_amount} to user ${uid}`)
    const userId = sanitizeId(uid)
    const conversionId = requestsDb.push({
      userId,
      confirmed: false,
      adjAmount: adjusted_amount,
      amount,
    }).key
    console.info(`Assigned conversion ID ${conversionId} to unconfirmed request`)
    response.status(200).send(`${JSON.stringify({ conversion_id: conversionId })}`)
    return
  } else if (postType === PostType.CONFIRM) {
    const { job_title, conversion_id } = data.payload
    if (!conversion_id || !job_title) {
      response
        .status(400)
        .send(
          `Missing conversion_id or job_title in received payload: ${JSON.stringify(data.payload)}`
        )
      return
    }
    console.info(`Confirmation request for ${conversion_id}`)
    requestsDb
      .child(conversion_id)
      .update({ jobTitle: job_title, confirmed: true, conversionId: conversion_id }) // Duplicate storage of conversionId for convenient handleFigureEightConfirmation access
    console.info(`Request ${conversion_id} confirmed`)
    response.status(200).send('OK')
    return
  } else {
    console.log('Unkown post type')
    response.status(400).send('Unkown post type')
    return
  }
})
