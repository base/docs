This is a [Vocs](https://vocs.dev) project bootstrapped with the Vocs CLI.

# Creating New Docs

You can create a new doc by adding a `.md` or `.mdx` file in
`apps/base-docs/docs/pages`.

The URL path for your doc will map to the file location. For instance, `bounty.mdx`
is found within `chain/security`. So the URL for this link will be:
`docs.base.org/chain/security/bounty`.


# Running Docs Locally

Follow these steps to run Base-Docs locally:

1. Clone repo

2. Enable yarn by running `corepack enable`

3. Make sure you have installed all dependencies by running `yarn install` at
the top-level

4. `yarn build`

4. Start development server by running `yarn dev`

