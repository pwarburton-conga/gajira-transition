const { get } = require('lodash')

const serviceName = 'jira'
const { format } = require('url')
const client = require('./client')(serviceName)

class Jira {
  constructor ({ baseUrl, token, email }) {
    this.baseUrl = baseUrl
    this.token = token
    this.email = email
  }

  async getIssue (issueId, query = {}) {
    const { fields = [], expand = [] } = query

    try {
      return this.fetch('getIssue', {
        pathname: `/rest/api/2/issue/${issueId}`,
        query: {
          fields: fields.join(','),
          expand: expand.join(','),
        },
      })
    } catch (error) {
      if (get(error, 'res.status') === 404) {
        return
      }

      throw error
    }
  }

  async getIssueTransitions (issueId) {
    return this.fetch('getIssueTransitions', {
      pathname: `/rest/api/2/issue/${issueId}/transitions`,
    }, {
      method: 'GET',
    })
  }

  async transitionIssue (issueId, data) {
    const destinationPath = `/rest/api/2/issue/${issueId}/transitions`;
    console.log(`Sending to ${destinationPath}`);
    console.log("body: ");
    console.log(JSON.stringify(data));
    return this.fetch('transitionIssue', {
      pathname: destinationPath,
    }, {
      method: 'POST',
      body: data,
    })
  }

  async fetch (apiMethodName,
    { host, pathname, query },
    { method, body, headers = {} } = {}) {
    const url = format({
      host: host || this.baseUrl,
      pathname,
      query,
    })

    if (!method) {
      method = 'GET'
    }

    console.log("Using method: " + method);
    
    if (headers['Content-Type'] === undefined) {
      headers['Content-Type'] = 'application/json'
    }

    if (headers.Authorization === undefined) {
      headers.Authorization = `Basic ${Buffer.from(`${this.email}:${this.token}`).toString('base64')}`
    }

    // strong check for undefined
    // cause body variable can be 'false' boolean value
    if (body && headers['Content-Type'] === 'application/json') {
      body = JSON.stringify(body)
    }

    const state = {
      req: {
        method,
        headers,
        body,
        url,
      },
    }

    try {
      await client(state, `${serviceName}:${apiMethodName}`)
      console.log("returned state", state);
    } catch (error) {
      const fields = {
        originError: error,
        source: 'jira',
      }

      delete state.req.headers

      throw Object.assign(
        new Error('Jira API error'),
        state,
        fields
      )
    }

    return state.res.body
  }
}

module.exports = Jira
