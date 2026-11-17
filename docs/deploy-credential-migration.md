# Deployment credential migration

This change depends on the coordinated infrastructure migration. Before merging:

1. Install a dedicated dispatch GitHub App on `matt-riley/infra`, granting only repository contents write (required by the dispatch API). It must not have Actions or Secrets administration permission.
2. Set this repository's `INFRA_DISPATCH_APP_ID` variable to that App's ID and `INFRA_DISPATCH_PRIVATE_KEY` secret to its private key. Never distribute the infra administrator App key to source repositories.
3. Configure infra's separate artifact-reader App to read this source repository's contents and Actions, then complete the infra migration review.
4. Remove the legacy source `APP_ID` variable and `PRIVATE_KEY` secret only after confirming no remaining consumer uses them. Verify a successful production-branch CI dispatch and the receiver's exact revision validation.

The reusable workflow is pinned to public `matt-riley-ci` commit `2aedbf6107ff792f9dd41b9c9074dc4801b5888c`. This PR neither creates Apps nor changes live secrets or deployments.

The scheduled data sync also needs `TOOLS_READER_APP_ID` and `TOOLS_READER_PRIVATE_KEY` from a dedicated App with contents read permission, installed only on the private tool repositories the sync reads. The App's token cannot dispatch deployments or write to repositories. The sync uses this repository's own `GITHUB_TOKEN` to push generated data; external checkouts do not retain credentials.
