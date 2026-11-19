# Archive Shelf

Search 75 physical pages from nine issues of Statistics Canada’s *The Daily*, published from July 2001 to September 2010. The issues follow Canadian internet access and online shopping. Each PDF preserves the complete publication, including unrelated releases from the same day.

<!-- coolcode:guide -->
Search “dial-up” to compare page 2 of the July 26, 2001 issue with page 5 of the September 23, 2003 issue. Open the PDF at either page or download the matching citations.
<!-- /coolcode:guide -->

[Open Archive Shelf](https://coolcode.ca/archive-shelf/) · [Read the field note](https://coolcode.ca/field-notes/finding-the-dial-up-page/)

Search a word or consecutive words across the collection, or narrow the search to a single issue. A public search keeps the phrase and issue in the URL so another reader can repeat it. Each result includes the passage, the page text, and a link to the physical PDF page. Download results as JSON for the entire matching set. The complete issues and links to the government originals remain available with JavaScript disabled.

Choose **Your files** to search UTF-8 plain text and Markdown in your browser. Form-feed characters mark page breaks. Files, search phrases and excerpts from this collection stay in memory in the tab until you remove the files or reload. The export is a download to your device. For a persistent PDF and text collection, use the [Linux edition](../tools/archive-shelf/README.md).

## Sources and reproduction

Adapted from Statistics Canada, *The Daily*, catalogue 11-001, selected issues dated 2001-07-26 through 2010-09-27. This does not constitute an endorsement by Statistics Canada of this product.

Source: Statistics Canada, *The Daily*, publication dates listed in the issue manifest. Reproduced and distributed on an “as is” basis with the permission of Statistics Canada. The issue directory includes the Government of Canada PDF for each item. The [manifest](issues.json) records its date, topic, original URL, local filename and SHA-256 digest. The files in [issues](issues/) contain the original PDF bytes. Search normalizes whitespace in the extracted page text. Tables and multicolumn material should be checked against the printed layout. [Government catalogue](https://publications.gc.ca/site/eng/9.827951/publication.html) · [Statistics Canada Open Licence](https://www.statcan.gc.ca/en/terms-conditions/open-licence)

From the repository root, rebuild the searchable index and the HTML issue directory with Python 3 and Poppler. The script verifies each PDF against the manifest.

```sh
python3 tools/archive-shelf/build_public_index.py
python3 tools/archive-shelf/build_public_index.py --check
```
