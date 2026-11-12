// Package capsule is the plain-file, content-addressed archive format.
package capsule

import "time"

const FormatVersion = 1

type Resource struct {
	URL string `json:"url"`
	FinalURL string `json:"final_url,omitempty"`
	Title string `json:"title,omitempty"`
	MediaType string `json:"media_type,omitempty"`
	Hash string `json:"hash,omitempty"`
	Size int64 `json:"size"`
	Status int `json:"status"`
	Error string `json:"error,omitempty"`
	Links []string `json:"links,omitempty"`
}

type Snapshot struct {
	Version int `json:"version"`
	ID string `json:"id"`
	Created time.Time `json:"created"`
	Label string `json:"label"`
	Seeds []string `json:"seeds"`
	Resources []Resource `json:"resources"`
	Truncated bool `json:"truncated"`
}

type Change struct {
	Kind string `json:"kind"`
	URL string `json:"url"`
	BeforeHash string `json:"before_hash,omitempty"`
	AfterHash string `json:"after_hash,omitempty"`
}

type Verification struct {
	Objects int `json:"objects"`
	Bytes int64 `json:"bytes"`
	Errors []string `json:"errors"`
}
