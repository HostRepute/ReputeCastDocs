package imports

// sourceProblem maps source errors to API problems.
func sourceProblem(err error) error {
	if se, ok := sourceError(err); ok {
		status := http.StatusBadGateway
		switch se.Code {
		case CodeAuthFailed:
			status = http.StatusUnprocessableEntity
		case CodeRateLimited:
			status = http.StatusTooManyRequests
		}
		p := api.Err(status, se.Code, se.Message)
		if se.Status > 0 {
			p = p.WithMeta("sourceStatus", se.Status)
		}
		return p
	}
	if errors.Is(err, ErrNoKey) {
		return api.Invalid("body.apiKey", "Paste an API key.")
	}
	var fe *FileError
	if errors.As(err, &fe) {
		code := "file_unreadable"
		if len(fe.BadRows) > 0 {
			code = "file_columns"
		}
		return api.Err(http.StatusUnprocessableEntity, code, fe.Message)
	}
	return err
}
